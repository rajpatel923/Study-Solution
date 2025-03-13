// src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the refresh token from cookies
    const refreshToken = request.cookies.get("refreshToken");

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token not found" },
        { status: 401 }
      );
    }

    // Forward the request to your backend API
    const response = await fetch(`${process.env.API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken.value}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Token refresh failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Create a response with the new tokens set as cookies
    const nextResponse = NextResponse.json({ success: true });

    // Set the new cookies
    nextResponse.cookies.set({
      name: "accessToken",
      value: data.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: data.expiresIn,
    });

    nextResponse.cookies.set({
      name: "refreshToken",
      value: data.refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: data.expiresIn * 7, // Assuming refresh token lasts longer
    });

    return nextResponse;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
