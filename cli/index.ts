#!/usr/bin/env node
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import open from "open";
import http from "http";
import { scrapeUserStats } from "./scraper.js";

const DEFAULT_SERVER_URL = "https://wrapped.sahil.ink";
const createdApps: string[] = [];
let globalConfigToken: string | undefined;

async function cleanup() {
  if (createdApps.length === 0 || !globalConfigToken) return;
  console.log(chalk.yellow("\nCleaning up created apps..."));

  await Promise.all(
    createdApps.map(async (appId) => {
      let attempt = 0;
      const maxAttempts = 10;

      while (attempt < maxAttempts) {
        try {
          const res = await fetch(
            "https://slack.com/api/apps.manifest.delete",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${globalConfigToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ app_id: appId }),
            }
          );

          const data = (await res.json()) as any;
          if (data.ok) {
            console.log(chalk.gray(`App ${appId} deleted.`));
            return;
          }

          attempt++;
          if (attempt < maxAttempts) {
            console.log(
              chalk.yellow(
                `Failed to delete app ${appId}, retrying in 60 seconds (attempt ${attempt}/${maxAttempts})...`
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 60000));
          }
        } catch (e) {
          attempt++;
          if (attempt < maxAttempts) {
            console.log(
              chalk.yellow(
                `Failed to delete app ${appId}, retrying in 60 seconds (attempt ${attempt}/${maxAttempts})...`
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 60000));
          } else {
            console.error(
              chalk.red(
                `Failed to delete app ${appId} after ${maxAttempts} attempts:`
              ),
              e
            );
          }
        }
      }
    })
  );
  createdApps.length = 0;
}

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

async function createApp(
  configurationToken: string,
  appNumber: number
): Promise<{ clientId: string; clientSecret: string; appId: string }> {
  const port = 3056 + appNumber - 1;
  const manifest = {
    display_information: {
      name: `Wrapped Local Scraper ${appNumber}`,
    },
    features: {
      bot_user: {
        display_name: `Wrapped Local ${appNumber}`,
        always_online: false,
      },
    },
    oauth_config: {
      redirect_urls: [`http://localhost:${port}/callback`],
      scopes: {
        user: [
          "search:read",
          "users:read",
          "channels:read",
          "groups:read",
          "im:read",
          "mpim:read",
        ],
        bot: ["users:read"],
      },
    },
    settings: {
      org_deploy_enabled: false,
      socket_mode_enabled: false,
      token_rotation_enabled: false,
    },
  };

  let attempt = 0;
  const maxAttempts = 10;

  while (true) {
    try {
      const res = await fetch("https://slack.com/api/apps.manifest.create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configurationToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ manifest: JSON.stringify(manifest) }),
      });

      const retryAfterHeader = res.headers.get("retry-after");
      const data = (await res.json()) as any;

      if (data.ok) {
        return {
          clientId: data.credentials.client_id,
          clientSecret: data.credentials.client_secret,
          appId: data.app_id,
        };
      }

      if (data.error === "ratelimited" || res.status === 429) {
        attempt += 1;
        if (attempt > maxAttempts) {
          throw new Error(
            "Failed to create app: ratelimited (too many retries)"
          );
        }

        const retryAfterSeconds = retryAfterHeader
          ? parseInt(retryAfterHeader, 10)
          : 30;
        const waitMs = retryAfterSeconds * 1000;

        console.log(
          chalk.yellow(
            `Rate limited while creating app #${appNumber}. Waiting ${retryAfterSeconds} seconds before retrying (attempt ${attempt}/${maxAttempts})...`
          )
        );

        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (data.errors) {
        console.error("Manifest Errors:", JSON.stringify(data.errors, null, 2));
      }
      throw new Error(`Failed to create app: ${data.error}`);
    } catch (e: any) {
      if (
        e.message &&
        (e.message.includes("fetch failed") ||
          e.message.includes("network") ||
          e.message.includes("ECONNREFUSED") ||
          e.message.includes("ETIMEDOUT"))
      ) {
        attempt += 1;
        if (attempt > maxAttempts) {
          throw new Error(
            `Failed to create app after ${maxAttempts} attempts: ${e.message}`
          );
        }

        const waitSeconds = 30;
        console.log(
          chalk.yellow(
            `Network error while creating app #${appNumber}. Waiting ${waitSeconds} seconds before retrying (attempt ${attempt}/${maxAttempts})...`
          )
        );

        await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
        continue;
      }
      throw e;
    }
  }
}

async function getOAuthToken(
  clientId: string,
  clientSecret: string,
  port: number,
  appNumber: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.url?.startsWith("/callback")) {
        const url = new URL(req.url, `http://localhost:${port}`);
        const code = url.searchParams.get("code");

        if (code) {
          res.end(
            `Authentication successful for Scraper #${appNumber}! You can close this window and return to the terminal.`
          );
          server.close();

          try {
            const tokenRes = await fetch(
              "https://slack.com/api/oauth.v2.access",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  client_id: clientId,
                  client_secret: clientSecret,
                  code,
                  redirect_uri: `http://localhost:${port}/callback`,
                }),
              }
            );

            const data = (await tokenRes.json()) as any;
            if (data.ok) {
              resolve(data.authed_user.access_token);
            } else {
              reject(new Error(`OAuth failed: ${data.error}`));
            }
          } catch (e) {
            reject(e);
          }
        } else {
          res.end("Missing code parameter.");
          reject(new Error("Missing code"));
        }
      }
    });

    server.listen(port, async () => {
      const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=search:read,users:read,channels:read,groups:read,im:read,mpim:read&redirect_uri=http://localhost:${port}/callback`;
      await open(url);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const debug = args.includes("--debug");
  const more = args.includes("--more");
  const appsArg = args.find((a) => a.startsWith("--apps="));
  let numApps = appsArg ? parseInt(appsArg.split("=")[1]) : 5;

  const options = {
    channels: args.includes("--channels"),
    dms: args.includes("--dms"),
    total: args.includes("--total"),
    confessions: args.includes("--confessions"),
    meta: args.includes("--meta"),
    prox2: args.includes("--prox2"),
  };

  const hasSpecificOptions = Object.values(options).some((v) => v);

  console.log(chalk.bold.green("🎁 HC Wrapped 2025"));
  console.log(
    chalk.gray(
      "We create a temporary local Slack app to scrape your history safely."
    )
  );
  console.log(chalk.gray("Your messages are NOT sent to the server.\n"));

  const response = await prompts([
    {
      type: "text",
      name: "configToken",
      message: "Enter your App Configuration Token (starts with xoxe.xoxp-...)",
      validate: (value) =>
        value.includes("xoxp") ? true : "Token must contain xoxp-",
    },
    {
      type: "text",
      name: "serverUrl",
      message: "Wrapped Server URL",
      initial: process.env.NEXT_PUBLIC_SERVER_URL || DEFAULT_SERVER_URL,
    },
    {
      type: "text",
      name: "uploadSecret",
      message: "Enter your Upload Secret (from the Wrapped website)",
      validate: (value) => (value.length > 0 ? true : "Secret is required"),
    },
    {
      type: "number",
      name: "numApps",
      message: "Number of apps to use",
      initial: numApps,
      validate: (value) =>
        Number.isInteger(value) && value > 0
          ? true
          : "Number of apps must be a positive integer",
    },
  ]);

  if (!response.configToken || !response.uploadSecret) {
    console.log(chalk.red("Operation cancelled."));
    process.exit(1);
  }

  if (response.numApps && Number.isInteger(response.numApps)) {
    numApps = response.numApps;
  }

  globalConfigToken = response.configToken;

  const validateSpinner = ora("Validating secret...").start();
  let hasExistingData = false;

  try {
    const validateRes = await fetch(
      `${response.serverUrl}/api/validate-secret`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: response.uploadSecret }),
      }
    );

    const validateData = (await validateRes.json()) as any;
    if (!validateData.valid) {
      validateSpinner.fail("Invalid upload secret!");
      process.exit(1);
    }

    if (validateData.status === "completed" && validateData.hasData) {
      hasExistingData = true;
    }

    validateSpinner.succeed("Secret validated!");
  } catch (e) {
    validateSpinner.fail("Failed to validate secret (server might be down)");
    process.exit(1);
  }

  let filters = hasSpecificOptions ? options : undefined;

  // more options to patch data if no specific flags were set
  if (!hasSpecificOptions && (more || hasExistingData)) {
    const selection = await prompts({
      type: "multiselect",
      name: "value",
      message: hasExistingData
        ? "Existing data found! What would you like to update?"
        : "What data do you want to update?",
      choices: [
        { title: "Channels", value: "channels", selected: !hasExistingData },
        { title: "DMs", value: "dms", selected: !hasExistingData },
        { title: "Total Messages", value: "total", selected: !hasExistingData },
        {
          title: "Confessions",
          value: "confessions",
          selected: !hasExistingData,
        },
        { title: "Meta", value: "meta", selected: !hasExistingData },
        { title: "Prox2", value: "prox2", selected: !hasExistingData },
      ],
      hint: "- Space to select. Return to submit",
    });

    if (selection.value) {
      filters = {
        channels: selection.value.includes("channels"),
        dms: selection.value.includes("dms"),
        total: selection.value.includes("total"),
        confessions: selection.value.includes("confessions"),
        meta: selection.value.includes("meta"),
        prox2: selection.value.includes("prox2"),
      };
    } else if (hasExistingData) {
      console.log(chalk.yellow("No options selected. Exiting."));
      process.exit(0);
    }
  }

  try {
    const tokens: string[] = [];

    console.log(
      chalk.yellow(`\nCreating and authenticating ${numApps} apps...`)
    );

    for (let i = 0; i < numApps; i++) {
      const appNumber = i + 1;
      const port = 3056 + i;

      const setupSpinner = ora(
        `[${appNumber}/${numApps}] Creating temporary Slack app (Scraper #${appNumber})...`
      ).start();
      const appInfo = await createApp(response.configToken, appNumber);
      createdApps.push(appInfo.appId);
      setupSpinner.succeed(
        `[${appNumber}/${numApps}] App created (Scraper #${appNumber})!`
      );

      console.log(
        chalk.yellow(
          `[${appNumber}/${numApps}] Please authorize Scraper #${appNumber} in your browser...`
        )
      );
      const userToken = await getOAuthToken(
        appInfo.clientId,
        appInfo.clientSecret,
        port,
        appNumber
      );
      tokens.push(userToken);
      console.log(
        chalk.green(
          `[${appNumber}/${numApps}] Scraper #${appNumber} authenticated!\n`
        )
      );
    }

    const spinner = ora("Starting scraper...").start();

    const results = await scrapeUserStats({
      tokens,
      debug,
      onProgress: (msg) => {
        spinner.text = msg;
      },
      filters,
    });

    if (results.metaMessages === 0 && (!filters || filters.meta)) {
      spinner.warn(
        chalk.yellow(
          "Warning: No messages found in #meta. Please report this to @sahil on Slack."
        )
      );
    } else {
      spinner.succeed("Scraping complete!");
    }

    await cleanup();

    const uploadSpinner = ora("Uploading results...").start();

    const uploadRes = await fetch(`${response.serverUrl}/api/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        results,
        secret: response.uploadSecret,
      }),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${err}`);
    }

    uploadSpinner.succeed("Results uploaded successfully!");
    console.log(chalk.green("\nYou can now view your Wrapped on the website!"));
    process.exit(0);
  } catch (error: any) {
    console.error(chalk.red("\nError:"), error.message);
    if (globalConfigToken) {
      await cleanup();
    }
    process.exit(1);
  }
}

main().catch(console.error);
