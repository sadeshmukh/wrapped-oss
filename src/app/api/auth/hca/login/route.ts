import { NextResponse } from 'next/server';
import { HCA_CLIENT_ID, HCA_REDIRECT_URI } from '@/lib/config';

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: HCA_CLIENT_ID,
    redirect_uri: HCA_REDIRECT_URI,
    scope: 'slack_id', 
  });

  const url = `https://auth.hackclub.com/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(url);
}

