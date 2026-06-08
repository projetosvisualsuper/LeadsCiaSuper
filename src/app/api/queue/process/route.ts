import { NextResponse } from 'next/server';
import { processQueueServerAction } from '@/app/actions/queue';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await processQueueServerAction();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
