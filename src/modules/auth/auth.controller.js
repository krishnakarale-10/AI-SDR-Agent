import asyncHandler from "my-async-handler";
import {registerUser,loginUser} from "../auth/auth.service.js"
import { ApiResponse } from "../../utils/apiResponse.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register= asyncHandler(async(req,res)=>{
    const { name, email, password } = req.body;
    const user = await registerUser(name,email,password);
    res.status(201).json(
    new ApiResponse(201, user, 'User registered successfully')
  );
});

export const login= asyncHandler(async(req,res)=>{
    const{email,password}= req.body
 const {user, accessToken, refresh_token}= await loginUser(email,password);
 res.cookie('refreshToken', refresh_token, COOKIE_OPTIONS);

  res.status(200).json(
    new ApiResponse(200, { user, accessToken }, 'Login successful')
  );
})