import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import {cookies}from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyAuthToken } from "../../../../../lib/auth";
import { jwtVerify } from "jose";

type RouteContext = {
    params : Promise <{id:string}>
};

export async function PATCH(
    request:Request,
    {params}: RouteContext
){
    try{
        //1. Verify the admin authentication
        const cookieStore =await cookies();
        const cookieToken = cookieStore.get("auth_token")?.value;
        const authHeader = request.headers.get("authorization");
        const bearerToken = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : null;
        const customTokenHeader = request.headers.get("x-auth-token")?.trim();
        const token = cookieToken || bearerToken || customTokenHeader;

     if (!token){
        return NextResponse.json(
            {
                message:"Authentication required"
            },
            {
                status:401
            }
        );
     }   
     let authUser;
     try{
        authUser=await verifyAuthToken(token);
     } catch{
        return NextResponse.json(
            {message:"Invalid or expired session"},
            {status:401}
        )
     }

//2. Only admin can change user passwords
if (!authUser){
    return NextResponse.json(
        {message:"Invalid or expired session"},
        {status:401}
    );
}
if (authUser.role!=="ADMIN"){
    return NextResponse.json(
        {
            message:"Admin access required"},
            {status:403})
        }
//.3 Validate the target user ID
const { id }=await params;
const userId=Number(id);

if(!Number.isSafeInteger(userId)||userId<=0){
    return NextResponse.json(
        {message:"Invalid user ID"},
        {status:400}
    );
}
//4. Read the new password
const body = await request.json();
const { newPassword }=body;
if(
    typeof newPassword !== "string"||
    newPassword.length<8||
    newPassword.length>128
){
    return NextResponse.json(
        {
            message:
            "Password must contain between 8 and 128 characters",
        },
        {status:400}
    )
}

//5. Find the target account
const existingUsher = await prisma.user.findUnique({
    where:{id:userId},
    select:{
        id:true,
        username:true,
        role:true,
    },
});

if (!existingUsher){
    return NextResponse.json(
        {
            message:"User account not found"
        },
        {status:404}
    )
}

// This endpoint manages USER accounts, not Admin accounts
if(existingUsher.role !== "USER"){
    return NextResponse.json(
        {
            message:"Only USER accounts can be update here"
        },{
            status:403
        }
    )
}

//6. Hash the new password
const hashedPassword=await bcrypt.hash(newPassword,10)
//7. Update the database
await prisma.user.update({
    where:{id:userId},
    data:{password:hashedPassword},
});

//8.Return a safe response without the password
return NextResponse.json({
    message:"User password changed successfully",
    user:{
        id:existingUsher.id,
        username:existingUsher.username,
    },
})
    } catch(error){
        console.error("PATCH/api/users/[id]error:",error)
        return NextResponse.json(
            {
                message:"Failed to change user password"
            },
            {status:500}
        )
    }
}

export async function DELETE(
    request: NextRequest,
    context:{params:Promise<{id:string}>}
){
    try{
        //1.Check authentication
        const cookieStore=await cookies();
        const token = cookieStore.get("auth_token")?.value;
        if(!token){
            return NextResponse.json(
                {
                    message:"Authentication required"
                },
                {
                    status:401
                }
            )
        }
//2. Verify JWT
const secret = process.env.AUTH_SECRET;
if(!secret){
    return NextResponse.json(
    { message:"Server authentication configuration error"},
    {status:500}
)}

const {payload}=await jwtVerify(
    token,
    new TextEncoder().encode(secret)
)

if(payload.role !=="ADMIN"){
return NextResponse.json(
    {message:"Admin access required"},
    {status:403}
)
}

//3.Validate target ID
const {id}=await context.params;
const userId=Number(id);
if (!Number.isInteger(userId)||userId<1){
    return NextResponse.json(
        {message:"Invalid user ID"},
        {status:400}
    )
}
//4. Prevent deleting the current admin account
const currentUserId=Number(payload.userId??payload.sub);
if(
    Number.isInteger(currentUserId)&&
    currentUserId===userId
){
    return NextResponse.json(
        {message:"You cannot delete your own account"},
        {status:400}
    )
}

//5.Check whether the user exists
const user=await prisma.user.findUnique({
    where:{id:userId},
    select:{id:true,username:true},
})

if(!user){
    return NextResponse.json(
        {message:"User not found"},
        {status:400}
    )
}

//6. Delete user
await prisma.user.delete({
    where:{id:userId},
})

return NextResponse.json({
    message:"User deleted successfully",
    user:{
        id:user.id,
        username:user.username,
    },
})
    }catch(error){
        if(
            error instanceof Error&&
            (error.name==="JWTExpired"||
                error.name==="JWTInvalid"||
                error.name==="JWTSignatureVerificationFailed")
            ){
                return NextResponse.json(
                    { message:"Invalid or expired authentication token"},
                    {status:401}
                )
            }
            console.error("DELETE user error",error);
            return NextResponse.json(
                {
                    message:"Failed to delete user"
                },
                {status:500}

        )
    }
}