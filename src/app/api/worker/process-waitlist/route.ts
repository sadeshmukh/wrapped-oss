import { NextResponse } from 'next/server';
import { processWaitlist } from '@/lib/worker';
import { getQueueSize, isProcessingActive } from '@/lib/waitlist';

export async function POST() {
  try {
    processWaitlist().catch((error) => {
      console.error('Error in waitlist processing:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Waitlist processing started',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process waitlist' },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!isProcessingActive()) {
      processWaitlist().catch(err => console.error('Background processing error:', err));
  }

  return NextResponse.json({
    queueSize: await getQueueSize(),
    processing: isProcessingActive(),
  });
}
