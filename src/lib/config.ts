export const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
export const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!;
export const SLACK_CLIENT_ID_MINI = process.env.SLACK_CLIENT_ID_MINI!;
export const SLACK_CLIENT_SECRET_MINI = process.env.SLACK_CLIENT_SECRET_MINI!;
export const SLACK_TEAM_ID = 'E09V59WQY1E';
export const REDIRECT_URI = 'https://wrapped.isitzoe.dev/api/auth/callback/slack';

export const SLACK_SCOPES = [
  'users:read',
  'search:read',
  'channels:read',
  'groups:read',
  'im:read',
  'mpim:read'
].join(',');

export const SLACK_SCOPES_NOPRIVATES = [
  'users:read',
  'search:read',
  'channels:read'
].join(',');
