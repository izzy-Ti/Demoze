import { NextResponse, type NextRequest } from "next/server";

/** Sets the anonymous device cookie (random id, httpOnly) on first visit. */
const DEVICE_COOKIE = "dz_device";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.has(DEVICE_COOKIE)) {
    response.cookies.set(DEVICE_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|logo.png|favicon.ico|robots.txt|sitemap.xml|opengraph-image).*)"],
};
