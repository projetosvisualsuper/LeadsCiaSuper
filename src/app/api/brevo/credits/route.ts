import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await d1Api.getSettings();
    if (!settings.brevoApiKey) {
      return NextResponse.json({ credits: 0, debug: 'No API Key' });
    }
    
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': settings.brevoApiKey
      }
    });

    if (!response.ok) {
      return NextResponse.json({ credits: 0, debug: 'Response not OK', status: response.status });
    }

    const data = await response.json();
    
    const sendLimitPlan = data.plan?.find((p: any) => p.creditsType === 'sendLimit');
    if (sendLimitPlan) return NextResponse.json({ credits: sendLimitPlan.credits, debug: 'sendLimit', raw: data });

    const subscriptionPlan = data.plan?.find((p: any) => p.type === 'subscription');
    if (subscriptionPlan) return NextResponse.json({ credits: subscriptionPlan.credits, debug: 'subscription', raw: data });

    const anyPlanWithCredits = data.plan?.find((p: any) => p.credits !== undefined);
    return NextResponse.json({ credits: anyPlanWithCredits?.credits || 0, debug: 'anyPlan', raw: data });

  } catch (error: any) {
    return NextResponse.json({ credits: 0, debug: error.message });
  }
}
