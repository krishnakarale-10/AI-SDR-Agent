import prisma from "../../config/prisma.js";
import {ApiError} from "../../utils/apiErrors.js";
import {hashPassword,verifyPassword} from "../../utils/password.utils.js";
import {generateAccessToken,generateRefreshToken,getRefreshTokenExpiryTime, hashRefreshToken} from "../../utils/auth.utils.js"
import "dotenv/config";



// we will make a register service first 
export const registerUser= async(name,email,password)=>{
    try {
        // we will  check if existing user already exist 
        const normalizedEmail = email?.trim()?.toLowerCase();
        // we will make a database query to  chechk if the user is presenr or not 
        const existingUser= await prisma.user.findUnique({
            where:{email:normalizedEmail},
            select:{id:true},
        })
    
        if(existingUser){
            throw new ApiError(400,"user already exists");
        };
    
        // now we wil hash password so we can create a user
    
        const hashedPassword = await hashPassword(password);
    
        // now we will create a new user in the databse
    
        const user = await prisma.user.create({
            data:{
                email:normalizedEmail,
                password_hash:hashedPassword,
                name:name
            },
            select: {
                id: true,
                name: true,
                email: true,
                created_at: true,
            },
        })
    
        if(!user) {
            throw new ApiError(500,"something went wrong while creating a user");
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

export const loginUser= async(email,password)=>{
    try {
        //we first noramilzed the email
        const normalizedEmail= email?.trim()?.toLowerCase();
        //we find the user first  and check if it exist or not
        const user = await prisma.user.findUnique({
            where:{email:normalizedEmail},
        });
        if(!user){
            throw new ApiError(404,"user not found");
        }
        //if user exist lets check this password useing verifypassword method which we have created in password.utility
        const isPasswordValid= await verifyPassword(password,user.password_hash);
        if(!isPasswordValid){
            throw new ApiError(401,"password is not correct");
        }
        // if we user password  is correct means user is authenticated and we hand him a accessToken 
        const accessToken = generateAccessToken(user.id);
        //now lets genrate a rawRefreshToken 
        const refreshToken = generateRefreshToken();
        //we can not store the raw refresh token we have to hash it 
        const refreshTokenHash = hashRefreshToken(refreshToken);
        // we have created new  refershToken now we have to store it 
        
        await prisma.refreshToken.create({
            data:{
                user_id:user.id,
                token_hash:refreshTokenHash,
                expires_at:getRefreshTokenExpiryTime()
            }
        });

        return {
            user:{
            id:user.id,
            name:user.name,
            email:user.email
        },
        accessToken,
        refreshToken
    }
    
    } catch (error) {
        throw error;
    }
}