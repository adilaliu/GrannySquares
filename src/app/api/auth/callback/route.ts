import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    if (code) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        // Create a proper redirect response that includes session cookies
        let redirectUrl;
        if (isLocalEnv) {
          redirectUrl = `${origin}${next}`;
        } else if (forwardedHost) {
          redirectUrl = `https://${forwardedHost}${next}`;
        } else {
          redirectUrl = `${origin}${next}`;
        }

        const response = NextResponse.redirect(redirectUrl);

        // Ensure session cookies are properly set
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // The middleware will handle cookie setting, but we ensure session is valid
          console.log(
            "Session established successfully for user:",
            session.user.id,
          );
        }

        return response;
      }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/auth-code-error`,
    );
  }
}
