import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateUploadSecret } from "@/lib/user-data";
import { verifySession } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const userId = session?.sub as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = await generateUploadSecret(userId);

  if (!secret) {
    return NextResponse.json(
      { error: "Failed to generate secret" },
      { status: 500 },
    );
  }

  return NextResponse.json({ secret });
}
