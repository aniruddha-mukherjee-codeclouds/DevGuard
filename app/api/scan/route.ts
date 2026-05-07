import { NextResponse } from 'next/server';
import { runAllChecks } from '@/lib/core/runAllChecks';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const targetPortParam = url.searchParams.get('targetPort');
    const processParam = url.searchParams.get('processes');
    const targetPort =
      targetPortParam && /^\d+$/.test(targetPortParam) ? Number(targetPortParam) : undefined;
    const processes = processParam
      ? Array.from(
          new Set(
            processParam
              .split(',')
              .map((value) => value.trim().toLowerCase())
              .filter(Boolean)
          )
        )
      : undefined;

    const data = await runAllChecks({
      configOverrides: {
        ...(targetPort ? { targetPort } : {}),
        ...(processes ? { processes } : {}),
      },
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
