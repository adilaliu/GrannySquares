import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.auth.signOut();
    }

    return NextResponse.json({ message: "Signed out successfully" });
  } catch (error) {
    console.error("Sign-out error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
