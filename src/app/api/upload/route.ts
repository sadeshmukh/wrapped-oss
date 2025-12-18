import { NextResponse } from "next/server";
import { processUpload } from "@/lib/user-data";

export async function POST(request: Request) {
  try {
    const { results, secret } = await request.json();

    if (!secret || !results) {
      return NextResponse.json(
        { error: "Missing secret or results" },
        { status: 400 }
      );
    }

    const result = await processUpload(secret, results);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
