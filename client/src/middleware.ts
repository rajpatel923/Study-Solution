// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath =
    path === "/" ||
    path === "/auth" ||
    path.startsWith("/api/auth") ||
    path.includes("_next") ||
    path.includes("public");

  // Check for authentication cookies
  const accessToken = request.cookies.get("accessToken");
  const refreshToken = request.cookies.get("refreshToken");
  const isAuthenticated = !!accessToken || !!refreshToken;

  // If trying to access a protected route without being authenticated
  if (!isPublicPath && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // If trying to access login/register page while already authenticated
  if (path === "/auth" && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api/auth (API routes for authentication)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
