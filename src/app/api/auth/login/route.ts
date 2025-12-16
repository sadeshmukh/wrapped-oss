import { NextResponse } from 'next/server';
import { SLACK_CLIENT_ID, SLACK_SCOPES, SLACK_TEAM_ID } from '@/lib/config';

const REDIRECT_URI = 'https://wrapped.isitzoe.dev/api/auth/callback/slack';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const github = searchParams.get('github');

  const url = `https://hackclub.slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&user_scope=${SLACK_SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&team=${SLACK_TEAM_ID}`;
  
  const res = NextResponse.redirect(url);
  
  if (github) {
    res.cookies.set('github_username', github, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60,
    });
  }

  return res;
}
