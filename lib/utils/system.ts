import { exec as cpExec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(cpExec);

export type ExecFn = (cmd: string) => Promise<{ stdout: string; stderr: string }>;

export interface ExecDeps {
  exec?: ExecFn;
  platform?: NodeJS.Platform;
}

export function getNodeVersion(): string {
  return process.version.replace(/^v/, '');
}

function extractPort(endpoint: string): number | null {
  const match = endpoint.match(/:(\d+)$/);
  if (!match) return null;

  const port = Number(match[1]);
  return Number.isInteger(port) ? port : null;
}

function parseWindowsListeningPorts(stdout: string): number[] {
  return stdout
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts[0] === 'TCP' && parts[3]?.toUpperCase() === 'LISTENING')
    .map((parts) => extractPort(parts[1]))
    .filter((port): port is number => port !== null);
}

function parseUnixListeningPorts(stdout: string): number[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('LISTEN'))
    .map((line) => {
      const parts = line.split(/\s+/);
      const endpoint = parts.find((part) => /:\d+$/.test(part));
      return endpoint ? extractPort(endpoint) : null;
    })
    .filter((port): port is number => port !== null);
}

export async function getListeningPorts(deps: ExecDeps = {}): Promise<number[]> {
  const execFn = deps.exec ?? execAsync;
  const platform = deps.platform ?? process.platform;
  const cmd = platform === 'win32' ? 'netstat -ano -p tcp' : platform === 'darwin' ? 'lsof -nP -iTCP -sTCP:LISTEN' : 'ss -ltn';
  const { stdout } = await execFn(cmd);
  const ports =
    platform === 'win32' ? parseWindowsListeningPorts(stdout) : parseUnixListeningPorts(stdout);

  return Array.from(new Set(ports)).sort((a, b) => a - b);
}

export async function getListeningProcessId(port: number, deps: ExecDeps = {}): Promise<number | null> {
  const execFn = deps.exec ?? execAsync;
  const platform = deps.platform ?? process.platform;

  if (platform === 'win32') {
    const { stdout } = await execFn(`netstat -ano -p tcp | findstr LISTENING | findstr :${port}`);
    const lines = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/\s+/);
      const localAddress = parts[1];
      const state = parts[3]?.toUpperCase();
      const pid = Number(parts[4]);

      if (extractPort(localAddress) === port && state === 'LISTENING' && Number.isInteger(pid)) {
        return pid;
      }
    }

    return null;
  }

  if (platform === 'darwin') {
    const { stdout } = await execFn(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`);
    const pid = Number(stdout.trim().split('\n')[0]);
    return Number.isInteger(pid) ? pid : null;
  }

  const { stdout } = await execFn(`ss -ltnp '( sport = :${port} )'`);
  const match = stdout.match(/pid=(\d+)/);
  return match ? Number(match[1]) : null;
}

export async function getProcessCommandLine(pid: number, deps: ExecDeps = {}): Promise<string | null> {
  const execFn = deps.exec ?? execAsync;
  const platform = deps.platform ?? process.platform;

  if (platform === 'win32') {
    const command = `powershell -NoProfile -Command "& { try { (Get-CimInstance Win32_Process -Filter \\"ProcessId = ${pid}\\").CommandLine } catch { '' } }"`;
    const { stdout } = await execFn(command);
    const commandLine = stdout.trim();
    return commandLine || null;
  }

  const { stdout } = await execFn(`ps -p ${pid} -o command=`);
  const commandLine = stdout.trim();
  return commandLine || null;
}

export async function getRunningProcesses(deps: ExecDeps = {}): Promise<string[]> {
  const execFn = deps.exec ?? execAsync;
  const platform = deps.platform ?? process.platform;
  const cmd = platform === 'win32' ? 'tasklist' : 'ps aux';
  const { stdout } = await execFn(cmd);
  return stdout.toLowerCase().split('\n').filter(Boolean);
}
