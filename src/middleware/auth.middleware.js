import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiErrors.js";

export const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
        token = parts[1];
      } else {
        token = req.headers.authorization.replace(/^Bearer\s+/i, "");
      }
    }

    if (!token) {
      throw new ApiError(401, "Unauthorized request: No token provided");
    }

    let decode;
    try {
      decode = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      );
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        throw new ApiError(401, "Access token has expired");
      }
      throw new ApiError(401, "Invalid access token");
    }

    const userId = decode.id || decode.sub;
    if (!userId) {
      throw new ApiError(401, "Invalid access token: Missing subject");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        email_verified: true,
        daily_send_limit: true,
      },
    });

    if (!user) {
      throw new ApiError(401, "User not found or invalid token");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user?.email_verified) {
    return next(new ApiError(403, "Email verification required"));
  }
  next();
};