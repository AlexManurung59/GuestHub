import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { createAuthToken } from "../../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Check required fields
    if (!username || !password) {
      return NextResponse.json(
        {
          error: "Username and password are required",
        },
        {
          status: 400,
        },
      );
    }

    // find user
    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    // if user does not exist

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid username or password",
        },
        {
          status: 401,
        },
      );
    }

    // Check whether account is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: "Your account has been disabled",
        },
        {
          status: 403,
        },
      );
    }

    // Compare password with bcrypt hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        {
          error: "Invalid username or password",
        },
        {
          status: 401,
        },
      );
    }

    const token = await createAuthToken({
      id:user.id,
      username:user.username,
      role:user.role,
    });

    const response = NextResponse.json({
      message:"Login successful",
      user:{
        id:user.id,
        username:user.username,
        name:user.name,
        role:user.role,
      },
    })


    response.cookies.set("auth_token",token,{
      httpOnly:true,
      secure:process.env.NODE_ENV==="production",
      sameSite:"lax",
      maxAge:60*60*8,
      path:"/",
    })

    // Login successful
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: "Something went wrong during login",
      },
      {
        status: 500,
      },
    );
  }
}
