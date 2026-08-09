import bcrypt from 'bcrypt';

const BCRYPT_SALT=12;

// we hash password we do not directy save password in to the  databse for security reason if  your database some how get leak
// still we have assurance that no one will able to understand that password because it is bycrpt has 
// and it's salt is added to it so it's unique
export const hashPassword=async(password)=>{
    return await bcrypt.hash(password,BCRYPT_SALT);
}


// here compare password and check weather it is same as the hash one
export const verifyPassword=async(password,hashPassword)=>{
    return await bcrypt.compare(password,hashPassword);
}