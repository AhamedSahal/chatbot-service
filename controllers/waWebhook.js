import axios from 'axios';
import { db } from '../db.js';
import { handleChatbotRequest } from './chatbotController.js';
import { sendOtpEmail } from '../AuthServices/otpEmailService.js';
import { generateJWTToken } from '../AuthServices/jwtService.js';

const GRAPH_URL = (id) => `https://graph.facebook.com/v21.0/${id}/messages`;

// OTP authentication section
// Persist OTP sessions and monthly-auth marker in MySQL instead of memory for scalability
// Tables: `otp_sessions` (short-lived OTP) and `monthly_auth` (durable monthly marker)

// Create tables if they don't exist
async function ensureAuthTables() {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS otp_sessions (
        phone VARCHAR(32) PRIMARY KEY,
        code VARCHAR(16) NOT NULL,
        expires_at BIGINT NOT NULL,
        verified TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await db.query(
      `CREATE TABLE IF NOT EXISTS monthly_auth (
        phone VARCHAR(32) PRIMARY KEY,
        auth_date BIGINT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
  } catch (e) {
    // Fail silently; subsequent queries will still throw and be handled per-request
  }
}

// Kick off table ensure in the background
ensureAuthTables();

// DB helpers
async function getOtpSessionByPhone(phone) {
  const [rows] = await db.query(
    'SELECT phone, code, expires_at AS expiresAt, verified FROM otp_sessions WHERE phone = ? LIMIT 1',
    [phone]
  );
  return rows && rows[0] ? rows[0] : null;
}

async function upsertOtpSession(phone, code, expiresAt) {
  await db.query(
    `INSERT INTO otp_sessions (phone, code, expires_at, verified)
     VALUES (?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), verified = 0`,
    [phone, code, expiresAt]
  );
}

async function markOtpVerified(phone) {
  await db.query('UPDATE otp_sessions SET verified = 1 WHERE phone = ?', [phone]);
}

async function deleteOtpSession(phone) {
  await db.query('DELETE FROM otp_sessions WHERE phone = ?', [phone]);
}

// Background cleanup: remove expired OTPs periodically
async function cleanupExpiredOtps() {
  const now = Date.now();
  try {
    await db.query('DELETE FROM otp_sessions WHERE expires_at < ?', [now]);
  } catch (e) {
    // ignore cleanup errors
  }
}

// run cleanup every minute
setInterval(() => {
  cleanupExpiredOtps();
}, 60 * 1000);

async function getMonthlyAuthDate(phone) {
  const [rows] = await db.query(
    'SELECT auth_date AS authDate FROM monthly_auth WHERE phone = ? LIMIT 1',
    [phone]
  );
  return rows && rows[0] ? rows[0].authDate : null;
}

async function upsertMonthlyAuthDate(phone, authDate) {
  await db.query(
    `INSERT INTO monthly_auth (phone, auth_date)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE auth_date = VALUES(auth_date)`,
    [phone, authDate]
  );
}

// Monthly authentication requirement (30 days)
const MONTHLY_AUTH_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function isMonthlyAuthRequired(authDate) {
  if (!authDate) return true; // No previous auth, require it
  const now = Date.now();
  const daysSinceAuth = (now - authDate) / MILLISECONDS_PER_DAY;
  return daysSinceAuth >= MONTHLY_AUTH_DAYS;
}

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function startOtpFlow(phone, email) {
  const code = generateSixDigitCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  await upsertOtpSession(phone, code, expiresAt);
  if (email) {
    try {
      await sendOtpEmail({ to: email, code });
    } catch (e) {
      // Silently ignore email send errors to avoid leaking details
    }
  }
  await sendWhatsAppText(
    phone,
    "*Welcome to Sarah AI Workplus Chatbot*. If you received the 6-digits OTP please enter it now. If you didn't receive it, type 'resend' to get a new code."
  );
}

function verify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

async function sendWhatsAppText(toNoPlus, text) {
  await axios.post(
    GRAPH_URL(process.env.PHONE_NUMBER_ID),
    { messaging_product: 'whatsapp', to: toNoPlus, text: { body: text } },
    { headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`, 
    'Content-Type': 'application/json',
     Accept: 'application/json' } }
  );
}

async function receive(req, res) {
  
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);
    const from = msg.from;                
    const userText = (msg.text?.body || '').trim();
    console.log("Received WhatsApp message:", msg);
    // 1) Look up user by WhatsApp number in DB
    let rows;
    try {
      [rows] = await db.query(
      'SELECT company_id, branch_id, id, user_id,first_name,last_name, email FROM employees WHERE phone = ? LIMIT 1',
      [from]
      );
    } catch (dbErr) {
      return res.sendStatus(500);
    }
    if (!rows || rows.length === 0) {
      await sendWhatsAppText(from, 'Your number is not registered. Please contact admin.');
      return res.sendStatus(200);
    }

    const user = rows[0];

    // OTP authentication section
    const lowerText = userText.toLowerCase();
    const lastMonthlyAuth = await getMonthlyAuthDate(from);
    const needsMonthlyAuth = isMonthlyAuthRequired(lastMonthlyAuth);

    // Trigger keywords to (re)start OTP flow
    if (needsMonthlyAuth && (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'code')) {
      await startOtpFlow(from, user.email);
      return res.sendStatus(200);
    }

    // If user asks for new code explicitly
    if (lowerText === 'code' || lowerText === 'resend') {
      await startOtpFlow(from, user.email);
      return res.sendStatus(200);
    }

    // If there is an active session and not yet verified, expect 6-digit code
    const session = await getOtpSessionByPhone(from);
    if (session && !session.verified) {
      const now = Date.now();
      if (now > session.expiresAt) {
        await deleteOtpSession(from);
        await sendWhatsAppText(from, "The code expired. Type 'resend' to request a new one.");
        return res.sendStatus(200);
      }

      const codeMatch = userText.match(/^\d{6}$/);
      if (!codeMatch) {
        await sendWhatsAppText(from, "That code is not valid. Please try again.");
        return res.sendStatus(200);
      }

      if (userText !== session.code) {
        await sendWhatsAppText(from, "That code is not valid. Please try again.");
        return res.sendStatus(200);
      }

      // success
      await markOtpVerified(from);
      const authDateNow = Date.now();
      await upsertMonthlyAuthDate(from, authDateNow); // Record authentication date
      await deleteOtpSession(from); // clear OTP after successful verification
      const fullName = `${user.first_name} ${user.last_name}`;
      await sendWhatsAppText(from, `Congratulation ${fullName}!. You can Access our Workplus Sarah AI Bot.`);
      // continue to chatbot after success
      // Do NOT forward this OTP message to chatbot. Wait for next user prompt.
      return res.sendStatus(200);
    } else if (needsMonthlyAuth) {
      // No session yet, expired monthly auth, or no trigger word: prompt to start
      const message = session 
        ? "Monthly authentication required. Reply 'hi' to start verification or type 'resend' to get a code."
        : "Reply 'hi' to start verification or type 'resend' to get a code.";
      await sendWhatsAppText(from, message);
      return res.sendStatus(200);
    }
    // 1a) Fetch user_type from users table and map to string
    let userTypeStr = 'EMPLOYEE';
    try {
      const [userTypeRows] = await db.query(
        'SELECT user_type FROM users WHERE user_id = ? LIMIT 1',
        [user.user_id]
      );
      const userTypeNum = userTypeRows && userTypeRows[0] ? userTypeRows[0].user_type : null;
      if (userTypeNum === 0) userTypeStr = 'SUPER_ADMIN';
      else if (userTypeNum === 1) userTypeStr = 'COMPANY_ADMIN';
      else if (userTypeNum === 3) userTypeStr = 'EMPLOYEE';
    } catch (dbErr) {
      // If any error occurs, default to EMPLOYEE
      userTypeStr = 'EMPLOYEE';
    }
    // 2) After successful verification or if monthly auth is valid, call your existing controller
    // Derive a real client IP to satisfy backend IP checks
    const xff = req.headers['x-forwarded-for'];
    const inferredIp = Array.isArray(xff)
      ? xff[0]
      : (typeof xff === 'string' && xff.split(',')[0]) || req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const userWithIP = {
      ...user,
      loggedInIPAddr: inferredIp
    };
    const jwtToken = generateJWTToken(userWithIP);
    const mockReq = {
      body: {
        messages: [{ role: 'user', content: userText }],
        locationId: user.branch_id,
        employeeId: user.id,
        usertype: userTypeStr
      },
      headers: {
        authorization: `Bearer ${jwtToken}`,
        companyid: String(user.company_id),
        usertype: userTypeStr
      }
    };
    let replyText = '';
    const mockRes = { status: () => mockRes, json: d => replyText = d?.botReply || d?.reply || '' };
   
    // OTP authentication section
    const monthlyAuthStillNeeded = isMonthlyAuthRequired(await getMonthlyAuthDate(from));
    if (monthlyAuthStillNeeded) {
      const finalSession = await getOtpSessionByPhone(from);
      if (!finalSession || !finalSession.verified) {
        return res.sendStatus(200);
      }
    }

    await handleChatbotRequest(mockReq, mockRes);

    await sendWhatsAppText(from, replyText || '');
    res.sendStatus(200);
  } catch (e) {
    console.error('WA receive error:', e?.response?.data || e.message);
    res.sendStatus(200);
  }
}

export default { verify, receive };
