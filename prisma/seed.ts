import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";


async function main(){
    const adminPassword = await bcrypt.hash("Seaps4359!",10);;
    const userPassword = await bcrypt.hash("User123!",10);

await prisma.user.upsert({
    where:{
        username:"admin",
    },
    update:{
        password:adminPassword,
        name:"Administrator",
        role:"ADMIN",
        isActive:true,
    },
    create:{
        username:"admin",
        password:adminPassword,
        name:"Administrator",
        role:"ADMIN",
        isActive:true,
    }
})

await prisma.user.upsert({
    where:{
        username:"user",
    },
    update:{
        password:userPassword,
        name:"User",
        role:"USER",
        isActive:true,
    },
    create:{
        username:"user",
        password:userPassword,
        name:"User",
        role:"USER",
        isActive:true
    }
})

console.log("Admin and User accounts created successfully");
}

main()
.catch((error)=>{
    console.error(error);
    process.exit(1);
})
.finally(async()=>{
    await prisma.$disconnect();;
})