export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    if (!id) {
      return new NextResponse('Bad request', { status: 400 });
    }

    const { results } = await d1Api.runQuery(`SELECT bannerImg FROM campaigns WHERE id = ? LIMIT 1`, [id]);
    
    if (!results || results.length === 0) {
      return new NextResponse('Not found', { status: 404 });
    }

    const campaign = results[0];
    const base64 = campaign?.bannerImg;

    if (!base64 || !base64.startsWith('data:image')) {
      return new NextResponse('Not found or not base64', { status: 404 });
    }

    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return new NextResponse('Invalid base64 format', { status: 400 });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': matches[1],
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching banner image from D1:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
