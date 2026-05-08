import { NextResponse } from 'next/server';
import { loadConfig } from '@/lib/utils/config';
import { runProjectRiskCheck } from '@/lib/checks/projectRiskCheck';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetPortParam = searchParams.get('targetPort');

  let targetPort: number | undefined;
  if (targetPortParam && /^\d+$/.test(targetPortParam)) {
    targetPort = Number(targetPortParam);
  }

  const loaded = loadConfig();
  const checkResult = await runProjectRiskCheck({
    ...loaded.config,
    ...(typeof targetPort === 'number' ? { targetPort } : {}),
  });

  return NextResponse.json(checkResult);
}
