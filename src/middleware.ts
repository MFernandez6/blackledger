import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/login")) return true;
        if (path.startsWith("/api/auth")) return true;
        if (path.startsWith("/api/referral-tags")) return true;
        // Claim routes enforce their own read/405 boundary in the handler.
        if (path.startsWith("/api/claims")) return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/claims/:path*",
    "/payouts/:path*",
    "/partners/:path*",
    "/schedules/:path*",
    "/reports/:path*",
    "/api/sync/:path*",
    "/api/export/:path*",
    "/api/upload",
    "/api/upload/:path*",
  ],
};
