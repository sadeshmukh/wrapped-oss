import { NextResponse } from 'next/server';
import { SLACK_CLIENT_ID_MINI, SLACK_SCOPES_NOPRIVATES, SLACK_TEAM_ID } from '@/lib/config';

const REDIRECT_URI = 'https://wrapped.isitzoe.dev/api/auth/callback/slack-noprivates';

export async function GET() {
  const url = `https://hackclub.slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID_MINI}&user_scope=${SLACK_SCOPES_NOPRIVATES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&team=${SLACK_TEAM_ID}`;
  return NextResponse.redirect(url);
}
