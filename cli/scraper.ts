export interface ScraperResult {
  userName?: string;
  topChannels?: { name: string; rank: number }[];
  topDms?: { name: string; count: number; image?: string }[];
  totalMessages?: number;
  confessionsMessages?: number;
  metaMessages?: number;
  prox2Messages?: number;
}

export interface ScraperOptions {
  tokens: string[];
  debug?: boolean;
  onProgress?: (message: string) => void;
  filters?: {
    channels?: boolean;
    dms?: boolean;
    total?: boolean;
    confessions?: boolean;
    meta?: boolean;
    prox2?: boolean;
  };
}

async function slackFetch(
  endpoint: string,
  token: string,
  params: Record<string, string> = {},
  retries = 5,
  debug = false
): Promise<any> {
  const url = new URL(`https://slack.com/api/${endpoint}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, value)
  );

  for (let i = 0; i < retries; i++) {
    try {
      if (debug) {
        console.log(
          `[DEBUG] Fetching ${endpoint} (Attempt ${i + 1}/${retries})`
        );
      }

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "1", 10);
        if (debug) {
          console.log(
            `[DEBUG] Rate limited on ${endpoint}. Retrying after ${retryAfter}s`
          );
        }
        await new Promise((resolve) =>
          setTimeout(resolve, (retryAfter + 1) * 1000)
        );
        continue;
      }

      const data = (await res.json()) as any;

      if (!data.ok) {
        if (debug) {
          console.log(`[DEBUG] Error from ${endpoint}: ${data.error}`);
        }

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
      if (debug) {
        console.error(`[DEBUG] Exception calling ${endpoint}:`, e);
      }
      if (i === retries - 1) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

export async function scrapeUserStats(
  options: ScraperOptions
): Promise<ScraperResult> {
  const { tokens, onProgress, debug, filters } = options;
  const token = tokens[0];
  const shouldScrape = (key: keyof NonNullable<typeof filters>) =>
    !filters || Object.values(filters).every((v) => !v) || filters[key];

  onProgress?.("Authenticating...");
  const authRes = await slackFetch("auth.test", token, {}, 5, debug);
  const slackUserId = authRes.user_id;
  if (!slackUserId) throw new Error("Could not get user ID");

  if (debug) {
    console.log(`[DEBUG] Authenticated as user ID: ${slackUserId}`);
  }

  const userInfoRes = await slackFetch(
    "users.info",
    token,
    {
      user: slackUserId,
    },
    5,
    debug
  );
  const userName = userInfoRes.ok
    ? userInfoRes.user.real_name || userInfoRes.user.name
    : undefined;

  let topChannels;
  let topDms;

  if (shouldScrape("channels") || shouldScrape("dms")) {
    onProgress?.("Fetching channels...");
    const channels: any[] = [];
    let nextCursor: string | undefined;

    do {
      const res: any = await slackFetch(
        "users.conversations",
        token,
        {
          types: "public_channel,private_channel,im",
          limit: "200",
          exclude_archived: "true",
          cursor: nextCursor || "",
        },
        5,
        debug
      );

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

      await new Promise((resolve) => setTimeout(resolve, 200));
    } while (nextCursor);

    onProgress?.(`Found ${channels.length} conversations. Scanning...`);

    const channelStats: any[] = [];
    const dmStats: any[] = [];

    const queue = [...channels];
    let processed = 0;
    const total = channels.length;

    onProgress?.(`Scanning conversations (0/${total})...`);

    const worker = async (workerToken: string, workerIndex: number) => {
      while (queue.length > 0) {
        const channel = queue.shift();
        if (!channel) break;

        let query = "";
        let shouldProcess = true;

        if (channel.is_im) {
          if (!shouldScrape("dms")) shouldProcess = false;
          else if (channel.user) {
            query = `from:<@${slackUserId}> to:<@${channel.user}>`;
          } else {
            shouldProcess = false;
          }
        } else {
          if (!shouldScrape("channels")) shouldProcess = false;
          else if (channel.is_private || channel.is_group) {
            query = `from:<@${slackUserId}> in:${channel.name}`;
          } else {
            query = `from:<@${slackUserId}> in:${channel.name}`;
          }
        }

        if (!shouldProcess) {
          processed++;
          continue;
        }

        try {
          if (debug) {
            console.log(
              `[DEBUG] Scraper #${workerIndex} processing: ${channel.is_im ? "DM" : channel.name}`
            );
          }
          const res = await slackFetch(
            "search.messages",
            workerToken,
            {
              query: query + " during:2025",
              count: "1",
            },
            5,
            debug
          );
          const count = res.ok ? res.messages.total : 0;

          const result = channel.is_im
            ? { type: "dm", userId: channel.user, count }
            : { type: "channel", name: channel.name, count };

          if (result.type === "channel") channelStats.push(result);
          if (result.type === "dm") dmStats.push(result);
        } catch (e) {}

        processed++;
        if (processed % 5 === 0 || processed === total) {
          onProgress?.(`Scanning conversations (${processed}/${total})...`);
        }
      }
    };

    await Promise.all(tokens.map((t, idx) => worker(t, idx + 1)));

    if (shouldScrape("channels")) {
      topChannels = channelStats
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((c, i) => ({ name: c.name, rank: i + 1 }));
    }

    if (shouldScrape("dms")) {
      topDms = await Promise.all(
        dmStats
          .filter((dm) => dm.userId !== slackUserId)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(async (dm) => {
            try {
              const u = await slackFetch(
                "users.info",
                token,
                { user: dm.userId },
                5,
                debug
              );
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
    }
  }

  onProgress?.("Fetching global stats...");

  let totalMessages;
  let confessionsMessages;
  let metaMessages;
  let prox2Messages;

  const promises = [];
  let currentTokenIdx = 0;
  const getToken = () => tokens[currentTokenIdx++ % tokens.length];

  if (shouldScrape("total")) {
    promises.push(
      slackFetch(
        "search.messages",
        getToken(),
        {
          query: `from:<@${slackUserId}> during:2025`,
          count: "1",
        },
        5,
        debug
      ).then((res) => (totalMessages = res.ok ? res.messages.total : 0))
    );
  }

  if (shouldScrape("confessions")) {
    promises.push(
      slackFetch(
        "search.messages",
        getToken(),
        {
          query: `from:<@${slackUserId}> in:confessions during:2025`,
          count: "1",
        },
        5,
        debug
      ).then((res) => (confessionsMessages = res.ok ? res.messages.total : 0))
    );
  }

  if (shouldScrape("meta")) {
    promises.push(
      slackFetch(
        "search.messages",
        getToken(),
        {
          query: `from:<@${slackUserId}> in:meta during:2025`,
          count: "1",
        },
        5,
        debug
      ).then((res) => (metaMessages = res.ok ? res.messages.total : 0))
    );
  }

  if (shouldScrape("prox2")) {
    promises.push(
      slackFetch(
        "search.messages",
        getToken(),
        {
          query: `from:<@${slackUserId}> to:<@U023L3A4UKX> during:2025`,
          count: "1",
        },
        5,
        debug
      ).then((res) => (prox2Messages = res.ok ? res.messages.total : 0))
    );
  }

  await Promise.all(promises);

  return {
    userName,
    ...(topChannels && { topChannels }),
    ...(topDms && { topDms }),
    ...(totalMessages !== undefined && { totalMessages }),
    ...(confessionsMessages !== undefined && { confessionsMessages }),
    ...(metaMessages !== undefined && { metaMessages }),
    ...(prox2Messages !== undefined && { prox2Messages }),
  };
}
