import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET is not defined");
}

const secretKey = new TextEncoder().encode(secret);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  console.log("PROXY RUNNING:", pathname);

  // Check authentication cookie
  const token = request.cookies.get("auth_token")?.value;

  // ==========================================
  // NOT LOGGED IN
  // ==========================================

  if (!token) {
    console.log("PROXY: No auth token → /login");

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  try {
    // Verify JWT
    const { payload } = await jwtVerify(
      token,
      secretKey
    );

    const role =
      typeof payload.role === "string"
        ? payload.role.trim().toUpperCase()
        : "";

    console.log("PROXY ROLE:", role);

    // ==========================================
    // ADMIN ROUTE
    // ==========================================

    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN") {
        console.log("PROXY: User tried to access ADMIN");

        return NextResponse.redirect(
          new URL("/login", request.url)
        );
      }

      return NextResponse.next();
    }

    // ==========================================
    // USER ROUTE
    // ==========================================

    if (pathname.startsWith("/user")) {
      if (role !== "USER") {
        console.log("PROXY: Admin tried to access USER");

        return NextResponse.redirect(
          new URL("/login", request.url)
        );
      }

      return NextResponse.next();
    }

    return NextResponse.next();

  } catch (error) {
    console.error(
      "PROXY: Invalid or expired token",
      error
    );

    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.delete("auth_token");

    return response;
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/user/:path*",
  ],
};