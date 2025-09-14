import { NextResponse } from "next/server";

export async function GET() {
  // Return the default user without authentication
  return NextResponse.json({
    user: {
      id: "8df050ee-e733-479f-83c8-b6a2efa0d95f",
      email: "default@example.com",
      user_metadata: {},
      app_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: {
        id: "8df050ee-e733-479f-83c8-b6a2efa0d95f",
        handle: "default-user",
        display_name: "Default User",
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    },
  });
}
