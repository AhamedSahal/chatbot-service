
import { mailer } from "./mailor.js";

export async function sendOtpEmail({ to, code }) {
  await mailer.sendMail({
    from: `"HRMS Bot" <${process.env.SMTP_USER}>`, // safest: from == SMTP_USER
    to,
    subject: "Your HRMS verification code",
    text: `Your code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <b>${code}</b>. It expires in 10 minutes.</p>`
  });
}

export async function sendTestOtpEmail(to) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await sendOtpEmail({ to, code });
  return { to, code };
}
