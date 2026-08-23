import prisma from './src/config/prisma.js'; prisma.user.deleteMany({where:{email:'karalekrishna0@gmail.com'}}).then(()=>console.log('done')).catch(e=>console.log(e)).finally(()=>process.exit(0));
