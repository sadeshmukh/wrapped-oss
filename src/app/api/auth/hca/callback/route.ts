import { NextResponse } from "next/server";
import {
  HCA_CLIENT_ID,
  HCA_CLIENT_SECRET,
  HCA_REDIRECT_URI,
} from "@/lib/config";
import { signSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const tokenResponse = await fetch("https://auth.hackclub.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: HCA_CLIENT_ID,
        client_secret: HCA_CLIENT_SECRET,
        code,
        redirect_uri: HCA_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("HCA Token Error:", tokenData);
      return NextResponse.json(
        { error: tokenData.error_description || "Failed to get token" },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch("https://auth.hackclub.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error("HCA User Error:", userData);
      return NextResponse.json(
        { error: "Failed to get user info" },
        { status: 400 }
      );
    }

    const slackId = userData.identity?.slack_id || userData.slack_id;

    if (!slackId) {
      console.error("HCA Missing Slack ID. Full User Data:", userData);
      return NextResponse.json(
        {
          error: "No Slack ID associated with this Hack Club Account",
          debug: userData,
        },
        { status: 400 }
      );
    }

    const userName = userData.name || userData.username;

    const res = NextResponse.redirect(
      new URL(
        "/",
        process.env.NEXT_PUBLIC_SERVER_URL || "https://wrapped.sahil.ink"
      )
    );

    const session = await signSession({
      sub: slackId,
      name: userName || undefined,
    });

    res.cookies.set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("HCA Auth Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
