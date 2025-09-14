import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, email, phone, redirectTo } = body;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    if (provider === "google") {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo ||
            `${request.nextUrl.origin}/api/auth/callback`,
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ url: data.url });
    }

    if (provider === "email" && email) {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo ||
            `${request.nextUrl.origin}/api/auth/callback`,
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        message: "Check your email for the login link!",
        data,
      });
    }

    if (provider === "phone" && phone) {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        message: "Check your phone for the verification code!",
        data,
      });
    }

    return NextResponse.json(
      { error: "Invalid provider or missing email/phone" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
