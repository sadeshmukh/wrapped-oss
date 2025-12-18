import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WrappedData } from "@/types/wrapped";
import { Client, Databases, Query } from "node-appwrite";
import { getUserData, removeUser, updateGlobalStats } from "@/lib/user-data";
import { getUserClan } from "@/lib/clans";
import { deleteShare } from "@/lib/share";
import { verifySession } from "@/lib/auth";

async function slackFetch(
  endpoint: string,
  token: string,
  params: Record<string, string> = {}
) {
  const url = new URL(`https://slack.com/api/${endpoint}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, value)
  );

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("slack_token")?.value;
  const sessionToken = cookieStore.get("session")?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const userId = session?.sub as string | undefined;
  // Fallback to name in session, or cookie if we really need it (legacy?)
  const userNameCookie = session?.name as string | undefined;
  const isNoPrivates = cookieStore.get("slack_noprivates")?.value === "true";

  const { searchParams } = new URL(request.url);
  const customHackatimeId = searchParams.get("customHackatime");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const storedData = await getUserData(userId);
    let topChannels: { name: string; rank: number }[] = [];
    let topDms: { name: string; count: number; image?: string }[] = [];

    if (storedData && storedData.topChannels) {
      topChannels = storedData.topChannels;
    }

    if (storedData && storedData.topDms) {
      topDms = storedData.topDms;
    }

    if (!storedData || !storedData.topChannels) {
      return NextResponse.json(
        {
          error: "Data not ready",
        },
        { status: 404 }
      );
    }

    let userName = userNameCookie || "Hack Clubber";

    if (storedData && storedData.userName) {
      userName = storedData.userName;
    }

    if (token) {
      try {
        const userRes = await slackFetch("users.info", token, { user: userId });
        if (userRes.ok) {
          userName = userRes.user.real_name || userRes.user.name;
        }
      } catch (e) {
        console.error("Failed to fetch user name", e);
      }
    }

    // Total
    let totalMessages = 0;
    if (storedData && storedData.totalMessages !== undefined) {
      totalMessages = storedData.totalMessages;
    } else if (token) {
      const searchRes = await slackFetch("search.messages", token, {
        query: `from:<@${userId}> during:2025`,
        count: "1",
      });
      totalMessages = searchRes.ok ? searchRes.messages.total : 0;
    }

    updateGlobalStats(userId, totalMessages).catch((err) =>
      console.error("Failed to update global stats:", err)
    );

    if (topChannels.length === 0) {
      topChannels.push({ name: "general", rank: 1 });
    }

    // Confessions
    let confessionsMessages = 0;
    if (storedData && storedData.confessionsMessages !== undefined) {
      confessionsMessages = storedData.confessionsMessages;
    } else if (token) {
      const confessionsRes = await slackFetch("search.messages", token, {
        query: `from:<@${userId}> in:confessions during:2025`,
        count: "1",
      });
      confessionsMessages = confessionsRes.ok
        ? confessionsRes.messages.total
        : 0;
    }

    // Meta
    let metaMessages = 0;
    if (storedData && storedData.metaMessages !== undefined) {
      metaMessages = storedData.metaMessages;
    } else if (token) {
      const metaRes = await slackFetch("search.messages", token, {
        query: `from:<@${userId}> in:meta during:2025`,
        count: "1",
      });
      metaMessages = metaRes.ok ? metaRes.messages.total : 0;
    }

    // Prox2
    let prox2Messages = 0;
    if (storedData && storedData.prox2Messages !== undefined) {
      prox2Messages = storedData.prox2Messages;
    } else if (!isNoPrivates && token) {
      const prox2Res = await slackFetch("search.messages", token, {
        query: `from:<@${userId}> to:<@U023L3A4UKX> during:2025`,
        count: "1",
      });
      prox2Messages = prox2Res.ok ? prox2Res.messages.total : 0;
    }

    // Hackatime
    let hackatimeHours = 0;
    try {
      const hackatimeRes = await fetch(
        `https://hackatime.hackclub.com/api/v1/users/${
          customHackatimeId || userId
        }/stats?features=projects`
      );
      if (hackatimeRes.ok) {
        const hackatimeData = await hackatimeRes.json();
        if (hackatimeData.data && hackatimeData.data.total_seconds) {
          hackatimeHours = Math.round(hackatimeData.data.total_seconds / 3600);
        }
      }
    } catch (e) {
      console.error("Failed to fetch Hackatime stats", e);
    }

    // YSWS
    let ySwsSubmissions = 0;
    let ySwsProjects: string[] = [];
    const githubUsername = cookieStore.get("github_username")?.value;
    let requiresGithub = false;

    if (githubUsername) {
      try {
        const client = new Client()
          .setEndpoint(
            process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
          )
          .setProject(process.env.APPWRITE_PROJECT_ID || "");
        const databases = new Databases(client);

        const yswsRes = await databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID || "wrappeddb",
          "ysws-projects",
          [Query.equal("githubUsername", githubUsername)]
        );

        ySwsSubmissions = yswsRes.total;

        const rawProjects = yswsRes.documents.map((doc: any) => {
          let name = doc.yswsName;
          if (typeof name === "string") {
            name = name.replace(/^\["|"\]$/g, "").replace(/"/g, "");
          }
          return name;
        });

        ySwsProjects = Array.from(new Set(rawProjects)).filter(Boolean);
      } catch (e) {
        console.error("Failed to fetch YSWS stats", e);
      }
    } else {
      requiresGithub = true;
    }

    const data: WrappedData = {
      userName,
      totalMessages: totalMessages || 0,
      topChannels,
      topDms: topDms.length > 0 ? topDms : [{ name: "Unknown :(", count: 0 }],
      confessionsMessages,
      metaMessages,
      prox2Messages,
      ySwsSubmissions,
      ySwsProjects,
      hackatimeHours,
      randomGroup: getUserClan(userId).name,
    };

    return NextResponse.json({ ...data, requiresGithub });
  } catch (error: any) {
    console.error("Data fetch error:", error);

    if (
      error.message &&
      (error.message.includes("token_revoked") ||
        error.message.includes("account_inactive"))
    ) {
      if (userId) await removeUser(userId);

      return NextResponse.json(
        { error: "Token revoked. Please login again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const userId = session?.sub as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await removeUser(userId);
    await deleteShare(userId);

    cookieStore.delete("slack_token");
    cookieStore.delete("session");
    // Clean up legacy cookies if they exist
    cookieStore.delete("slack_user_id");
    cookieStore.delete("slack_noprivates");
    cookieStore.delete("slack_user_name");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting wrapped:", error);
    return NextResponse.json(
      { error: "Failed to delete wrapped" },
      { status: 500 }
    );
  }
}
