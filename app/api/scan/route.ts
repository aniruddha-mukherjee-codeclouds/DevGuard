import { NextResponse } from 'next/server';
import { runAllChecks } from '@/lib/core/runAllChecks';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const targetPortParam = url.searchParams.get('targetPort');
    const targetPort =
      targetPortParam && /^\d+$/.test(targetPortParam) ? Number(targetPortParam) : undefined;

    const data = await runAllChecks({
      configOverrides: targetPort ? { targetPort } : undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unexpected failure in scan runner',
      },
      { status: 500 }
    );
  }
}
