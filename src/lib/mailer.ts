import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
  console.warn(
    "⚠️ SMTP environment variables are not fully set. Email sending may fail."
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: Number(SMTP_PORT) === 465, // true for 465, false for 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  console.log("📧 Email sent:", info.messageId);
  return info;
}
