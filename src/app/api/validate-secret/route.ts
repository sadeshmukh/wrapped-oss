import { NextResponse } from "next/server";
import { validateUploadSecret } from "@/lib/user-data";

export async function POST(request: Request) {
  try {
    const { secret } = await request.json();

    if (!secret) {
      return NextResponse.json({ error: "Missing secret" }, { status: 400 });
    }

    const result = await validateUploadSecret(secret);

    return NextResponse.json(result);
  } catch (e) {
    console.error("Validation error:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

