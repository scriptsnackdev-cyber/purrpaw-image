import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const expectedPassword = process.env.APP_PASSWORD || "200Reeboel";

    // Simple password check
    if (password === expectedPassword) {
      const response = NextResponse.json({ success: true });
      
      // Set HttpOnly secure cookie for session
      response.cookies.set({
        name: "purrpaw_session",
        value: "authenticated",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
