import { NextRequest, NextResponse } from "next/server";
import{ cookies} from "next/headers";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../../lib/prisma";

export async function POST (
    request: NextRequest,
    context:{params:Promise<{id:string}>}
){
    try{
        //1. Check the admin authentication cookie
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        if (!token){
            return NextResponse.json(
                {
                    message:"Authentication required"
                },
                {status:401}
            )
        }
        //2. Verify the token
        const secret = process.env.AUTH_SECRET;

        if(!secret){
            return NextResponse.json(
                {
                    message:"Server authentication configuration error"
                },
                {status:500}
            )
        }

        const {payload}=await jwtVerify(
            token,
            new TextEncoder().encode(secret)
        );

        if (payload.role !== "ADMIN"){
            return NextResponse.json(
                {
                    message:"Admin access required"
                },
                {status:403}
            )
        }
//3. Get the target user ID
const {id}=await context.params;
const userId=Number(id);

if(!Number.isInteger(userId)||userId<1){
    return NextResponse.json(
        { message:"Invalid user ID"},
        {status:400}
    );
}

//4.Read the submitted password
const body=await request.json();
const{password}=body;
if (typeof password !=="string" || !password){
    return NextResponse.json(
        {message:"Password is required"},
        {status:400}
    )
}
//5. Find the user in the database
const user=await prisma.user.findUnique({
    where:{id:userId},
    select:{id:true,password:true},
});

if(!user){
    return NextResponse.json(
        {message:"User not found"},
        {status:404}
    )
}

//6. Compare password against the bcrypt hash
const isValid = await bcrypt.compare(password,user.password);
return NextResponse.json({
    verified:isValid,
    message:isValid
    ?"Password verified successfully"
    :"Password is incorrect",
});
    }catch(error){
        if(
            error instanceof Error &&
            (error.name==="JWTExpired" ||
                error.name==="JWTInvalid" ||
                error.name==="JWTSignatureVerificationFailed")
            ){
                return NextResponse.json(
                    {
                        message:"Invalid or expired authentication token"
                    },
                    {status : 401}
                )
            }
            console.error("POST Verify password error",error);
            return NextResponse.json(
                {message:"Internal server error"},
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

