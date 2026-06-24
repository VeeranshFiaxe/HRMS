// src/lib/email.ts
// Email sending via Nodemailer

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  const appName = process.env.APP_NAME || "HRMS";

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `${appName} <noreply@company.com>`,
    to,
    subject: `${appName} — Password Reset Request`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; max-width: 480px; margin: 0 auto; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
          .logo { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 24px; }
          h2 { color: #1e293b; margin: 0 0 16px; font-size: 20px; }
          p { color: #475569; line-height: 1.6; margin: 0 0 16px; }
          .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 8px 0 24px; }
          .footer { color: #94a3b8; font-size: 13px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
          .url { word-break: break-all; color: #64748b; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🏢 ${appName}</div>
          <h2>Reset your password</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}" class="btn">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
          <div class="footer">
            <p>If the button above doesn't work, paste this URL into your browser:</p>
            <p class="url">${resetUrl}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name},\n\nReset your ${appName} password:\n${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  tempPassword: string
): Promise<void> {
  const appName = process.env.APP_NAME || "HRMS";
  const loginUrl = `${process.env.APP_URL || "http://localhost:3000"}/auth/login`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `${appName} <noreply@company.com>`,
    to,
    subject: `Welcome to ${appName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; max-width: 480px; margin: 0 auto; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
          .logo { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 24px; }
          h2 { color: #1e293b; margin: 0 0 16px; font-size: 20px; }
          p { color: #475569; line-height: 1.6; margin: 0 0 16px; }
          .cred { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; }
          .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 8px 0 24px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🏢 ${appName}</div>
          <h2>Welcome, ${name}!</h2>
          <p>Your account has been created. Here are your login credentials:</p>
          <div class="cred">
            <strong>Email:</strong> ${to}<br>
            <strong>Password:</strong> ${tempPassword}
          </div>
          <p>Please change your password after first login.</p>
          <a href="${loginUrl}" class="btn">Log In Now</a>
        </div>
      </body>
      </html>
    `,
  });
}
