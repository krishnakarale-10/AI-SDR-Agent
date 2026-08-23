import prisma from "../../config/prisma.js";
import { ApiError } from "../../utils/apiErrors.js";
import { hashPassword, verifyPassword } from "../../utils/password.utils.js";
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiryTime, hashRefreshToken, getEmailVerificationExpiryTime, getPasswordResetExpiryTime, generateVerificationToken, genrateResetToken, hashVerificationToken, hashResetToken } from "../../utils/auth.utils.js"
import "dotenv/config";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../services/email.service.js";

// we will make a register service first 
export const registerUser = async (name, email, password) => {
    try {
        // we will  check if existing user already exist 
        const normalizedEmail = email?.trim()?.toLowerCase();
        // we will make a database query to  chechk if the user is presenr or not 
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        })

        if (existingUser) {
            throw new ApiError(400, "user already exists");
        };

        // now we wil hash password so we can create a user

        const hashedPassword = await hashPassword(password);

        // now we will create a new user in the databse

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                password_hash: hashedPassword,
                name: name
            },
            select: {
                id: true,
                name: true,
                email: true,
                created_at: true,
            },
        })

        if (!user) {
            throw new ApiError(500, "something went wrong while creating a user");
        }
        // we do not want to return a user if email fails  so we catch that error and log it but dont throw the error
        try { 
            await createAndSendVerification(user.id, user.email);
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
        } 
        return user;

    } catch (error) {
        if (error.code === "P2002") {
            throw new ApiError(
                409,
                "A user with this email already exists"
            );
        }
        throw error;
    }
};

export const loginUser = async (email, password) => {
    try {
        //we first noramilzed the email
        const normalizedEmail = email?.trim()?.toLowerCase();
        //we find the user first  and check if it exist or not
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (!user) {
            throw new ApiError(404, "user not found");
        }
        //if user exist lets check this password useing verifypassword method which we have created in password.utility
        const isPasswordValid = await verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            throw new ApiError(401, "password is not correct");
        }
        // if we user password  is correct means user is authenticated and we hand him a accessToken 
        const accessToken = generateAccessToken(user.id);
        //now lets genrate a rawRefreshToken 
        const refreshToken = generateRefreshToken();
        //we can not store the raw refresh token we have to hash it 
        const refreshTokenHash = hashRefreshToken(refreshToken);
        // we have created new  refershToken now we have to store it 

        await prisma.refreshToken.create({
            data: {
                user_id: user.id,
                token_hash: refreshTokenHash,
                expires_at: getRefreshTokenExpiryTime()
            }
        });

        // Return user details along with access and refresh tokens
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            accessToken,
            refreshToken
        }

    } catch (error) {
        throw error;
    }
};

export const refreshAccessToken = async (refreshToken) => {
    try {
        if (!refreshToken) {
            throw new ApiError(401, "refresh token is required");
        }

        const hashedToken = hashRefreshToken(refreshToken);

        const storedToken = await prisma.refreshToken.findUnique({
            where: { token_hash: hashedToken }
        });

        if (!storedToken) {
            throw new ApiError(401, "invalid token");
        }

        // Token reuse detection: if a revoked token is attempted to be used, revoke all tokens for this user
        if (storedToken.revoked) {
            await prisma.refreshToken.updateMany({
                where: { user_id: storedToken.user_id },
                data: { revoked: true }
            });
            throw new ApiError(401, "token is revoked");
        }

        if (new Date(storedToken.expires_at) < new Date()) {
            throw new ApiError(401, "token has been expired");
        }

        const newRefreshToken = generateRefreshToken();
        const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
        const newAccessToken = generateAccessToken(storedToken.user_id);
        const newExpiryTime = getRefreshTokenExpiryTime();

        // Atomically revoke current token and issue new token (Rotation)
        await prisma.$transaction([
            prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { revoked: true }
            }),
            prisma.refreshToken.create({
                data: {
                    user_id: storedToken.user_id,
                    token_hash: newRefreshTokenHash,
                    expires_at: newExpiryTime
                }
            })
        ]);

        return {
            newRefreshToken,
            newAccessToken
        };

    } catch (error) {
        throw error;
    }
};

export const logoutUser = async (refreshToken) => {
    try {
        if (!refreshToken) {
            return { success: true };
        }

        const hashedToken = hashRefreshToken(refreshToken);
        await prisma.refreshToken.updateMany({
            where: { token_hash: hashedToken },
            data: { revoked: true }
        });

        return { success: true };
    } catch (error) {
        throw error;
    }
};


 const createAndSendVerification = async (userId, email) => {
    const rawToken = generateVerificationToken();
    const hashedVerficationToken = hashVerificationToken(rawToken);

    // Clean up old unverified tokens for this user before creating a new one
    await prisma.emailVerification.deleteMany({
        where: { user_id: userId, verified: false }
    });

    await prisma.emailVerification.create({
        data: {
            user_id: userId,
            token: hashedVerficationToken,
            expires_at: getEmailVerificationExpiryTime(),
        }
    });

    await sendVerificationEmail(email, rawToken);
};

export const verifyEmail = async (rawToken) => {
    try {
        if (!rawToken) {
            throw new ApiError(400, "Verification token is required");
        }

        const hashedToken = hashVerificationToken(rawToken);
        const record = await prisma.emailVerification.findUnique({
            where: { token: hashedToken },
            select: { id: true, user_id: true, expires_at: true, verified: true }
        });

        if (!record) {
            throw new ApiError(400, "token is invalid");
        }

        if (record.verified) {
            throw new ApiError(400, "already verified user");
        }

        if (new Date(record.expires_at) < new Date()) {
            throw new ApiError(400, "token is expired");
        }

        await prisma.$transaction([
            prisma.emailVerification.update({
                where: { id: record.id },
                data: { verified: true }
            }),
            prisma.user.update({
                where: { id: record.user_id },
                data: { email_verified: true }
            }),
            // Delete stale unverified tokens instead of marking them verified
            prisma.emailVerification.deleteMany({
                where: {
                    user_id: record.user_id,
                    verified: false,
                    id: { not: record.id },
                },
            }),
        ]);

        return { success: true, message: "Email verified successfully" };
    } catch (error) {
        throw error;
    }
};

export const resendVerification = async (userId, email) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email_verified: true },
        });

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (user.email_verified) {
            throw new ApiError(400, "Email is already verified");
        }

        await createAndSendVerification(userId, email);

        return { success: true };
    } catch (error) {
        throw error;
    }
};

export const forgetPassWord = async (email) => {
    try {
        if (!email) {
            throw new ApiError(400, "Email is required");
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true }
        });

        // Return generic message to prevent user enumeration attacks
        if (!user) {
            return { success: true, message: "If an account with this email exists, a password reset link has been sent" };
        }

        // Invalidate old unused reset tokens for this user
        await prisma.passwordReset.updateMany({
            where: { user_id: user.id, used: false },
            data: { used: true }
        });

        const rawToken = genrateResetToken();
        const hashedToken = hashResetToken(rawToken);

        await prisma.passwordReset.create({
            data: {
                user_id: user.id,
                token: hashedToken,
                expires_at: getPasswordResetExpiryTime()
            }
        });

        await sendPasswordResetEmail(user.email, rawToken);

        return { success: true, message: "Password reset link sent to your email" };
    } catch (error) {
        throw error;
    }
};

export const resetPassword = async (rawToken, newPassword) => {
    try {
        if (!rawToken || !newPassword) {
            throw new ApiError(400, "Reset token and new password are required");
        }

        const hashedToken = hashResetToken(rawToken);
        const record = await prisma.passwordReset.findUnique({
            where: { token: hashedToken },
            select: { id: true, user_id: true, expires_at: true, used: true }
        });

        if (!record) {
            throw new ApiError(400, "Invalid or expired reset token");
        }

        if (record.used) {
            throw new ApiError(400, "This password reset token has already been used");
        }

        if (new Date(record.expires_at) < new Date()) {
            throw new ApiError(400, "Password reset token has expired");
        }

        const newPasswordHashed = await hashPassword(newPassword);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: record.user_id },
                data: { password_hash: newPasswordHashed }
            }),
            prisma.passwordReset.update({
                where: { id: record.id },
                data: { used: true }
            }),
            prisma.refreshToken.updateMany({
                where: { user_id: record.user_id, revoked: false },
                data: { revoked: true }
            }),
            prisma.passwordReset.updateMany({
                where: {
                    user_id: record.user_id,
                    used: false,
                    id: { not: record.id }
                },
                data: { used: true }
            })
        ]);

        return { success: true, message: "Password reset successfully" };
    } catch (error) {
        throw error;
    }
};