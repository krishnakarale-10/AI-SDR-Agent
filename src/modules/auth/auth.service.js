import prisma from "../../config/prisma.js";
import {ApiError} from "../../utils/apiErrors.js";
import {hashPassword,verifyPassword} from "../../utils/password.utils.js";
import {generateAccessToken,generateRefreshToken,getRefreshTokenExpiryTime} from "../../utils/auth.utils.js"
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

