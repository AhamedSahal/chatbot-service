// mailer.js
import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,          // email is hosted on GoDaddy
  port: Number(process.env.SMTP_PORT),  // 587 for STARTTLS
  secure: false,                        // STARTTLS
  auth: {
    user: process.env.SMTP_USER,        
    pass: process.env.SMTP_PASS
  }
});
