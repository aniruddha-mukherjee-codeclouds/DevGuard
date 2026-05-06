import { NextResponse } from 'next/server';
import { runAllChecks } from '@/lib/core/runAllChecks';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await runAllChecks();
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
