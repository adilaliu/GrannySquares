import { createClient } from "@/utils/supabase/middleware";
import { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    // This `createClient` function creates a Supabase client configured to use cookies
    const { response } = createClient(request);

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    console.error("Middleware error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
