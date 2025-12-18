import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const slackUserId = session?.sub;
  const slackToken = cookieStore.get('slack_token')?.value;

  return NextResponse.json({
    authenticated: !!slackUserId,
    slackUserId,
    hasSlackToken: !!slackToken,
  });
}

