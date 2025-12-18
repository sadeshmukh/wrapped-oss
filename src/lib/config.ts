export const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
export const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!;
export const SLACK_CLIENT_ID_MINI = process.env.SLACK_CLIENT_ID_MINI!;
export const SLACK_CLIENT_SECRET_MINI = process.env.SLACK_CLIENT_SECRET_MINI!;
export const SLACK_TEAM_ID = "E09V59WQY1E";

const SERVER_URL = (
  process.env.NEXT_PUBLIC_SERVER_URL || "https://wrapped.sahil.ink"
).replace(/\/$/, "");

export const REDIRECT_URI = `${SERVER_URL}/api/auth/callback/slack`;
export const HCA_REDIRECT_URI = `${SERVER_URL}/api/auth/hca/callback`;

export const SLACK_SCOPES = [
  "users:read",
  "search:read",
  "channels:read",
  "groups:read",
  "im:read",
  "mpim:read",
].join(",");

export const SLACK_SCOPES_NOPRIVATES = [
  "users:read",
  "search:read",
  "channels:read",
].join(",");

export const HCA_CLIENT_ID = process.env.NEXT_PUBLIC_HCA_CLIENT_ID!;
export const HCA_CLIENT_SECRET = process.env.HCA_CLIENT_SECRET!;
