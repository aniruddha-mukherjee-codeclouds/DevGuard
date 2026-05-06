import net from 'net';
import { exec as cpExec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(cpExec);

export type ExecFn = (cmd: string) => Promise<{ stdout: string; stderr: string }>;

export interface NetDeps {
  net?: Pick<typeof net, 'createServer'>;
}

export interface ExecDeps {
  exec?: ExecFn;
}

export function getNodeVersion(): string {
  return process.version.replace(/^v/, '');
}

export function isPortOpen(port: number, deps: NetDeps = {}): Promise<boolean> {
  const netModule = deps.net ?? net;
  return new Promise((resolve) => {
    const server = netModule.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

export async function getRunningProcesses(deps: ExecDeps = {}): Promise<string[]> {
  const execFn = deps.exec ?? execAsync;
  const cmd = process.platform === 'win32' ? 'tasklist' : 'ps aux';
  const { stdout } = await execFn(cmd);
  return stdout.toLowerCase().split('\n').filter(Boolean);
}
