import { Resend } from "resend"
import "dotenv/config"
import { ApiError } from "../utils/apiErrors.js"
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM;
const CLIENT_URL = process.env.CLIENT_URL;
const sendEmail = async ({ to, subject, html }) => {
    const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
    });

    if (error) {
        throw new ApiError(502, `Failed to send email: ${error.message || "unknown error"}`);
    }

    return data;
};
export const sendVerificationEmail = async (to, rawToken) => {
    try {
        const verifyUrl = `${CLIENT_URL}/verify-email?token=${rawToken}`;

        const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Verify your email</h2>
      <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
      <a href="${verifyUrl}" style="display:inline-block; padding:12px 24px; background:#111; color:#fff; text-decoration:none; border-radius:6px;">
        Verify Email
      </a>
      <p style="color:#666; font-size:13px; margin-top:24px;">
        If the button doesn't work, copy and paste this link: <br/>
        ${verifyUrl}
      </p>
    </div>
  `;

        return sendEmail({ to, subject: "Verify your email address", html });

    } catch (error) {

        throw new ApiError(502, `Failed to send email: ${error.message || "unknown error"}`);
    }

}

export const sendPasswordResetEmail = async (email, rawToken) => {
    try {
        const resetUrl = `${CLIENT_URL}/reset-password?token=${rawToken}`;

        const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>We received a request to reset your password. This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      <a href="${resetUrl}" style="display:inline-block; padding:12px 24px; background:#111; color:#fff; text-decoration:none; border-radius:6px;">
        Reset Password
      </a>
      <p style="color:#666; font-size:13px; margin-top:24px;">
        If the button doesn't work, copy and paste this link: <br/>
        ${resetUrl}
      </p>
    </div>
  `;

        return sendEmail({ to: email, subject: "Reset your password", html });
    } catch (error) {

        throw new ApiError(502, `Failed to send email: ${error.message || "unknown error"}`);
    }
}