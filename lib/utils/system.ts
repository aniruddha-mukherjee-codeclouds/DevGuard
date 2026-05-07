import { exec as cpExec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(cpExec);

export type ExecFn = (cmd: string) => Promise<{ stdout: string; stderr: string }>;

export interface ExecDeps {
  exec?: ExecFn;
  platform?: NodeJS.Platform;
}

export interface ListeningPortDetail {
  port: number;
  pid: number | null;
  processName: string | null;
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

function parseWindowsListeningPortDetails(stdout: string): Array<{ port: number; pid: number | null }> {
  return stdout
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts[0] === 'TCP' && parts[3]?.toUpperCase() === 'LISTENING')
    .map((parts) => ({
      port: extractPort(parts[1]),
      pid: Number.isInteger(Number(parts[4])) ? Number(parts[4]) : null,
    }))
    .filter((entry): entry is { port: number; pid: number | null } => entry.port !== null);
}

function parseDarwinListeningPortDetails(stdout: string): ListeningPortDetail[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => line.split(/\s+/))
    .map((parts): ListeningPortDetail | null => {
      const processName = parts[0] ?? null;
      const pid = Number(parts[1]);
      const endpoint = parts.find((part) => /:\d+$/.test(part));
      const port = endpoint ? extractPort(endpoint) : null;
      return port === null
        ? null
        : {
            port,
            pid: Number.isInteger(pid) ? pid : null,
            processName,
          };
    })
    .filter((entry): entry is ListeningPortDetail => entry !== null);
}

function parseLinuxListeningPortDetails(stdout: string): ListeningPortDetail[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('LISTEN'))
    .map((line): ListeningPortDetail | null => {
      const parts = line.split(/\s+/);
      const endpoint = parts.find((part) => /:\d+$/.test(part));
      const processMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
      const port = endpoint ? extractPort(endpoint) : null;
      return port === null
        ? null
        : {
            port,
            pid: processMatch ? Number(processMatch[2]) : null,
            processName: processMatch ? processMatch[1] : null,
          };
    })
    .filter((entry): entry is ListeningPortDetail => entry !== null);
}

function parseWindowsProcessMap(stdout: string): Map<number, string> {
  const processMap = new Map<number, string>();
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const matches = Array.from(line.matchAll(/"([^"]*)"/g)).map((match) => match[1]);
    if (matches.length < 2) continue;

    const imageName = matches[0];
    const pid = Number(matches[1]);
    if (!Number.isInteger(pid)) continue;

    processMap.set(pid, imageName.replace(/\.exe$/i, ''));
  }

  return processMap;
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

export async function getProcessName(pid: number, deps: ExecDeps = {}): Promise<string | null> {
  const execFn = deps.exec ?? execAsync;
  const platform = deps.platform ?? process.platform;

  if (platform === 'win32') {
    const command = `powershell -NoProfile -Command "& { try { (Get-Process -Id ${pid}).ProcessName } catch { '' } }"`;
    const { stdout } = await execFn(command);
    const processName = stdout.trim();
    return processName || null;
  }

  if (platform === 'darwin') {
    const { stdout } = await execFn(`ps -p ${pid} -o comm=`);
    const processName = stdout.trim();
    return processName || null;
  }

  const { stdout } = await execFn(`ps -p ${pid} -o comm=`);
  const processName = stdout.trim();
  return processName || null;
}

export async function getListeningPortDetails(deps: ExecDeps = {}): Promise<ListeningPortDetail[]> {
  const execFn = deps.exec ?? execAsync;
  const platform = deps.platform ?? process.platform;

  if (platform === 'win32') {
    const { stdout: netstatStdout } = await execFn('netstat -ano -p tcp');
    const { stdout: tasklistStdout } = await execFn('tasklist /fo csv /nh');
    const details = parseWindowsListeningPortDetails(netstatStdout);
    const processMap = parseWindowsProcessMap(tasklistStdout);

    return details
      .map((entry) => ({
        port: entry.port,
        pid: entry.pid,
        processName: entry.pid !== null ? processMap.get(entry.pid) ?? null : null,
      }))
      .sort((a, b) => a.port - b.port);
  }

  if (platform === 'darwin') {
    const { stdout } = await execFn('lsof -nP -iTCP -sTCP:LISTEN');
    return parseDarwinListeningPortDetails(stdout).sort((a, b) => a.port - b.port);
  }

  const { stdout } = await execFn('ss -ltnp');
  return parseLinuxListeningPortDetails(stdout).sort((a, b) => a.port - b.port);
}

export async function getListeningProcessId(port: number, deps: ExecDeps = {}): Promise<number | null> {
  const execFn = deps.exec ?? execAsync;
  const platform = deps.platform ?? process.platform;

  if (platform === 'win32') {
    let stdout = '';
    try {
      ({ stdout } = await execFn(`netstat -ano -p tcp | findstr LISTENING | findstr :${port}`));
    } catch {
      return null;
    }
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
