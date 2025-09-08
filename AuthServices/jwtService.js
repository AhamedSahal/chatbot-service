import jwt from "jsonwebtoken";
import crypto from "crypto";

// Load both values (parity with Java @Value)
const RAW_SECRET = process.env.JWT_SECRET || "dev-secret";

const API_KEY = process.env.JWT_APIKEY || "dev-apikey";

// In Java, jwtSecret is base64-encoded at @PostConstruct
function base64url(source) {
  return Buffer.from(JSON.stringify(source))
    .toString('base64')     // standard base64
    .replace(/=/g, '')      // remove '=' padding
    .replace(/\+/g, '-')    // replace '+' with '-'
    .replace(/\//g, '_');   // replace '/' with '_'
}

// Header with only alg
const header = { alg: "HS256" };

// Encode
const encodedHeader = base64url(header);
console.log("Encoded JWT/*************************** Header:", encodedHeader);

// 5 days validity
const VALIDITY_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 5;
const VALIDITY_SECONDS = 60 * 60 * 24 * 5;

const tokenCache = new Map();

function getUserKey(userData) {
  return `${userData.email || userData.user_id}_${userData.company_id}`;
}

function isTokenExpired(generatedAt) {
  return Date.now() - generatedAt > VALIDITY_IN_MILLISECONDS;
}

/**
 * Create JWT token (parity with Java)
 */
export function generateJWTToken(userData = {}) {
  const userKey = getUserKey(userData);
  const cached = tokenCache.get(userKey);

  if (cached && !isTokenExpired(cached.generatedAt)) {
    return cached.token;
  }

  const { email, company_id } = userData;
  if (!email || !company_id) {
    throw new Error("generateJWTToken: 'email' and 'company_id' are required");
  }

  // Handle IP address from WhatsApp webhook
  const ip = userData.loggedInIPAddr || userData.ip || "127.0.0.1";
  const extra = userData.extra || {};

  const now = Math.floor(Date.now() / 1000);
  const exp = now + VALIDITY_SECONDS;
  
  const payload = {
    sub: email,
    loggedInUserIp: ip,
    iat: now,
    exp: exp,
    aud: `tenant_${company_id}`,
    ...extra,
  };
  
  // Create custom JWT with encoded header
  const encodedPayload = base64url(payload);
  
  // Create signature
  const data = encodedHeader + "." + encodedPayload;
  const signature = crypto.createHmac('sha256', RAW_SECRET).update(data).digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  // Combine to form JWT
  const token = encodedHeader + "." + encodedPayload + "." + signature;
  console.log("Generated JWT Token:", token);
  tokenCache.set(userKey, { token, generatedAt: Date.now() });
  return token;
}

export function verifyJWTToken(token) {
  return jwt.verify(token, RAW_SECRET, { algorithms: ["HS256"] });
}

export function decodeToken(token) {
  return jwt.decode(token);
}


export function validateApiKey(apiKey) {
  return apiKey === API_KEY;
}
