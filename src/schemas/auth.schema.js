import {z} from 'zod';

export const registerSchema=z.object({
    body:z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
    })
})  

export const loginSchema=z.object({
    body:z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
    })
})  

export const verifyEmailSchema =z.object({
    body:z.object({
        token:z.string({ required_error: "Verification token is required" })
        .trim()
        .min(1,"Verification token is required"),
    })
})

export const resendVerificationSchema=z.object({}).optional();

export const forgetPasswordSchema=z.object({
    body:z.object({
        email:z.string({required_error:"Email is required"})
        .trim()
        .toLowerCase()
        .email("Invalid email address"),
    })
})

export const resetPasswordSchema=z.object({
    body:z.object({
        token:z.string({required_error:"Token is required"})
        .trim()
        .min(1,"Token is required"),
        password:z.string({required_error:"Password is required"})
        .min(8,"Password must be at least 8 characters")
        .regex(/[A-Z]/,"Password must contain at least one uppercase letter")
        .regex(/[0-9]/,"Password must contain at least one number"),
    })
})