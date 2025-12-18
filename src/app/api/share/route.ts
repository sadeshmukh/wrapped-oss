import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createShare, deleteShare, getShareByUserId } from "@/lib/share";
import { getUserData } from "@/lib/user-data";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const userId = session?.sub as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicId = await getShareByUserId(userId);
  return NextResponse.json({ publicId });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const userId = session?.sub as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  }

  const publicId = await createShare(userId, data);

  if (!publicId) {
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 },
    );
  }

  return NextResponse.json({ publicId });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const userId = session?.sub as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const success = await deleteShare(userId);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to delete share" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
