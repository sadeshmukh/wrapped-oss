export interface ScraperResult {
  userName?: string;
  topChannels: { name: string; rank: number }[];
  topDms: { name: string; count: number; image?: string }[];
  totalMessages: number;
  confessionsMessages: number;
  metaMessages: number;
  prox2Messages: number;
}

export interface ScraperOptions {
  token: string;
  onProgress?: (message: string) => void;
}

async function slackFetch(
  endpoint: string,
  token: string,
  params: Record<string, string> = {},
  retries = 5
): Promise<any> {
  const url = new URL(`https://slack.com/api/${endpoint}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, value)
  );

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "1", 10);
        await new Promise((resolve) =>
          setTimeout(resolve, (retryAfter + 1) * 1000)
        );
        continue;
      }

      const data = (await res.json()) as any;

      if (!data.ok) {
        if (data.error === "ratelimited") {
          const retryAfter = 1;
          await new Promise((resolve) =>
            setTimeout(resolve, (retryAfter + 1) * 1000)
          );
          continue;
        }

        if (
          ["token_revoked", "account_inactive", "invalid_auth"].includes(
            data.error
          )
        ) {
          throw new Error(data.error);
        }

        if (i === retries - 1) throw new Error(data.error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      return data;
    } catch (e: any) {
      if (i === retries - 1) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

export async function scrapeUserStats(
  options: ScraperOptions
): Promise<ScraperResult> {
  const { token, onProgress } = options;

  onProgress?.("Authenticating...");
  const authRes = await slackFetch("auth.test", token);
  const slackUserId = authRes.user_id;
  if (!slackUserId) throw new Error("Could not get user ID");

  const userInfoRes = await slackFetch("users.info", token, {
    user: slackUserId,
  });
  const userName = userInfoRes.ok
    ? userInfoRes.user.real_name || userInfoRes.user.name
    : undefined;

  onProgress?.("Fetching channels...");
  const channels: any[] = [];
  let nextCursor: string | undefined;

  do {
    const res: any = await slackFetch("users.conversations", token, {
      types: "public_channel,private_channel,im",
      limit: "200",
      exclude_archived: "true",
      cursor: nextCursor || "",
    });

    if (res.ok) {
      channels.push(...res.channels);
      nextCursor = res.response_metadata?.next_cursor;
    } else {
      nextCursor = undefined;
    }

    if (process.env.ENV === "dev" && channels.length >= 5) {
      nextCursor = undefined;
      if (channels.length > 5) {
        channels.length = 5;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200)); // Be nice
  } while (nextCursor);

  onProgress?.(`Found ${channels.length} conversations. Scanning...`);

  const channelStats: any[] = [];
  const dmStats: any[] = [];

  const BATCH_SIZE = 5;
  let processed = 0;

  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, i + BATCH_SIZE);
    processed += batch.length;
    onProgress?.(`Scanning conversations (${processed}/${channels.length})...`);

    const results = await Promise.all(
      batch.map(async (channel: any) => {
        let query = "";
        if (channel.is_im) {
          if (channel.user) {
            query = `from:<@${slackUserId}> to:<@${channel.user}>`;
          } else {
            return { type: "skip" };
          }
        } else if (channel.is_private || channel.is_group) {
          query = `from:<@${slackUserId}> in:${channel.name}`;
        } else {
          query = `from:<@${slackUserId}> in:${channel.name}`;
        }

        try {
          const res = await slackFetch("search.messages", token, {
            query: query + " during:2025",
            count: "1",
          });
          const count = res.ok ? res.messages.total : 0;

          if (channel.is_im) {
            return { type: "dm", userId: channel.user, count };
          } else {
            return { type: "channel", name: channel.name, count };
          }
        } catch (e) {
          return { type: "error" };
        }
      })
    );

    results.forEach((r: any) => {
      if (r.type === "channel") channelStats.push(r);
      if (r.type === "dm") dmStats.push(r);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const topChannels = channelStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((c, i) => ({ name: c.name, rank: i + 1 }));

  const topDms = await Promise.all(
    dmStats
      .filter((dm) => dm.userId !== slackUserId)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(async (dm) => {
        try {
          const u = await slackFetch("users.info", token, { user: dm.userId });
          if (u.ok && u.user) {
            return {
              name: u.user.real_name || u.user.name,
              count: dm.count,
              image: u.user.profile.image_192 || u.user.profile.image_512,
            };
          }
        } catch {}
        return { name: dm.userId, count: dm.count };
      })
  );

  onProgress?.("Fetching global stats...");
  const [totalRes, confessionsRes, metaRes, prox2Res] = await Promise.all([
    slackFetch("search.messages", token, {
      query: `from:<@${slackUserId}> during:2025`,
      count: "1",
    }),
    slackFetch("search.messages", token, {
      query: `from:<@${slackUserId}> in:confessions during:2025`,
      count: "1",
    }),
    slackFetch("search.messages", token, {
      query: `from:<@${slackUserId}> in:meta during:2025`,
      count: "1",
    }),
    slackFetch("search.messages", token, {
      query: `from:<@${slackUserId}> to:<@U023L3A4UKX> during:2025`,
      count: "1",
    }),
  ]);

  return {
    userName,
    topChannels,
    topDms,
    totalMessages: totalRes.ok ? totalRes.messages.total : 0,
    confessionsMessages: confessionsRes.ok ? confessionsRes.messages.total : 0,
    metaMessages: metaRes.ok ? metaRes.messages.total : 0,
    prox2Messages: prox2Res.ok ? prox2Res.messages.total : 0,
  };
}
