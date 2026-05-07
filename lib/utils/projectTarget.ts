import fs from 'fs';
import path from 'path';
import { getListeningProcessId, getProcessCommandLine, type ExecDeps } from './system';

export interface ProjectTargetDeps extends ExecDeps {
  fileExists?: (p: string) => boolean;
}

export interface ProjectTargetResolution {
  projectRoot: string | null;
  pid: number | null;
  commandLine: string | null;
}

function tokenizeCommandLine(commandLine: string): string[] {
  const matches = commandLine.match(/"([^"]+)"|[^\s]+/g) ?? [];
  return matches.map((token) => token.replace(/^"(.*)"$/, '$1'));
}

function looksLikeAbsolutePath(token: string): boolean {
  return path.isAbsolute(token) || /^[A-Za-z]:\\/.test(token);
}

function findProjectRoot(candidatePath: string, fileExists: (p: string) => boolean): string | null {
  let current = path.extname(candidatePath) ? path.dirname(candidatePath) : candidatePath;
  const nodeModulesSegment = `${path.sep}node_modules${path.sep}`;
  const nodeModulesIndex = current.lastIndexOf(nodeModulesSegment);

  if (nodeModulesIndex >= 0) {
    current = current.slice(0, nodeModulesIndex);
  }

  while (true) {
    if (fileExists(path.join(current, '.env.example')) || fileExists(path.join(current, 'package.json'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function inferProjectRootFromCommandLine(
  commandLine: string,
  fileExists: (p: string) => boolean
): string | null {
  const tokens = tokenizeCommandLine(commandLine);
  const candidates: string[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];

    if (['--dir', '--cwd', '-C'].includes(token) && nextToken && looksLikeAbsolutePath(nextToken)) {
      candidates.push(nextToken);
    }

    if (looksLikeAbsolutePath(token)) {
      candidates.push(token);
    }
  }

  for (const candidate of candidates) {
    const projectRoot = findProjectRoot(candidate, fileExists);
    if (projectRoot) return projectRoot;
  }

  return null;
}

export async function resolveProjectRootFromPort(
  port: number,
  deps: ProjectTargetDeps = {}
): Promise<ProjectTargetResolution> {
  const fileExists = deps.fileExists ?? ((p: string) => fs.existsSync(p));
  const pid = await getListeningProcessId(port, deps);

  if (pid === null) {
    return { projectRoot: null, pid: null, commandLine: null };
  }

  const commandLine = await getProcessCommandLine(pid, deps);
  if (!commandLine) {
    return { projectRoot: null, pid, commandLine: null };
  }

  return {
    projectRoot: inferProjectRootFromCommandLine(commandLine, fileExists),
    pid,
    commandLine,
  };
}
