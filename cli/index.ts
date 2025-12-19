#!/usr/bin/env node
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import open from "open";
import http from "http";
import { scrapeUserStats } from "./scraper.js";

const DEFAULT_SERVER_URL = "https://wrapped.sahil.ink";

async function createApp(
  configurationToken: string
): Promise<{ clientId: string; clientSecret: string; appId: string }> {
  const manifest = {
    display_information: {
      name: "Wrapped Local Scraper",
    },
    features: {
      bot_user: {
        display_name: "Wrapped Local",
        always_online: false,
      },
    },
    oauth_config: {
      redirect_urls: ["http://localhost:3056/callback"],
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

  const res = await fetch("https://slack.com/api/apps.manifest.create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${configurationToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ manifest: JSON.stringify(manifest) }),
  });

  const data = (await res.json()) as any;
  if (!data.ok) {
    if (data.errors) {
      console.error("Manifest Errors:", JSON.stringify(data.errors, null, 2));
    }
    throw new Error(`Failed to create app: ${data.error}`);
  }

  return {
    clientId: data.credentials.client_id,
    clientSecret: data.credentials.client_secret,
    appId: data.app_id,
  };
}

async function getOAuthToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.url?.startsWith("/callback")) {
        const url = new URL(req.url, "http://localhost:3056");
        const code = url.searchParams.get("code");

        if (code) {
          res.end(
            "Authentication successful! You can close this window and return to the terminal."
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
                  redirect_uri: "http://localhost:3056/callback",
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

    server.listen(3056, async () => {
      const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=search:read,users:read,channels:read,groups:read,im:read,mpim:read&redirect_uri=http://localhost:3056/callback`;
      console.log(chalk.blue("Opening browser for authentication..."));
      await open(url);
    });
  });
}

async function main() {
  console.log(chalk.bold.green("🎁 HC Wrapped 2025"));
  console.log(
    chalk.gray(
      "This tool creates a temporary local Slack app to scrape your history safely."
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
  ]);

  if (!response.configToken || !response.uploadSecret) {
    console.log(chalk.red("Operation cancelled."));
    process.exit(1);
  }

  try {
    const setupSpinner = ora("Setting up temporary Slack app...").start();
    const { clientId, clientSecret, appId } = await createApp(
      response.configToken
    );
    setupSpinner.succeed("Temporary app created!");

    console.log(chalk.yellow("\nPlease authorize the app in your browser..."));
    const userToken = await getOAuthToken(clientId, clientSecret);
    console.log(chalk.green("Authentication successful!\n"));

    const spinner = ora("Starting scraper...").start();

    const results = await scrapeUserStats({
      token: userToken,
      onProgress: (msg) => {
        spinner.text = msg;
      },
    });

    spinner.succeed("Scraping complete!");

    try {
      await fetch("https://slack.com/api/apps.manifest.delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${response.configToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ app_id: appId }),
      });
      console.log(chalk.green("App deleted successfully."));
    } catch (e) {
      console.error(chalk.red("Error deleting app:"), e);
    }

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
  } catch (error: any) {
    console.error(chalk.red("\nError:"), error.message);
    process.exit(1);
  }
}

main().catch(console.error);
