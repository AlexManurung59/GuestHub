import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";

// GET - Get all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        id: "asc",
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET/api/users error:", error);
    return NextResponse.json(
      {
        message: "Failed to get users",
      },
      {
        status: 500,
      },
    );
  }
}

// POST - Create new USER account
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, name } = body;

    // Check required fields
    if (!username || !password || !name) {
      return NextResponse.json(
        {
          message: "Username, password, and name are required",
        },
        {
          status: 400,
        },
      );
    }

    // Check if username already exists
    const exitingUser = await prisma.user.findUnique({
      where: {
        username,
      },
    });
    if (exitingUser) {
      return NextResponse.json(
        {
          message: "Username already exists",
        },
        {
          status: 400,
        },
      );
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);
    //Create USER Account
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: "USER",
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "User account created successfully",
        user,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("POST/api/users error:", error);
    return NextResponse.json(
      {
        message: "Failed to create user account",
      },
      { status: 500 },
    );
  }
}
