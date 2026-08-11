import asyncHandler from "my-async-handler";
import { registerUser, loginUser, refreshAccessToken, logoutUser } from "../auth/auth.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await registerUser(name, email, password);
  res.status(201).json(
    new ApiResponse(201, user, "User registered successfully")
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await loginUser(email, password);
  res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

  res.status(200).json(
    new ApiResponse(200, { user, accessToken }, "Login successful")
  );
});

export const refreshTokenController = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const { newRefreshToken, newAccessToken } = await refreshAccessToken(refreshToken);
  res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);
  res.status(200).json(
    new ApiResponse(200, { accessToken: newAccessToken }, "Access token refreshed")
  );
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (refreshToken) {
    await logoutUser(refreshToken);
  }
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  res.status(200).json(
    new ApiResponse(200, null, "Logged out successfully")
  );
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, req.user, "User profile retrieved successfully")
  );
});