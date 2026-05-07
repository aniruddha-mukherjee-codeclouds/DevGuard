import type { CheckResult, DevGuardConfig } from '../types';
import type { ExecDeps } from '../utils/system';
import { getListeningPortDetails } from '../utils/system';
import {
  resolveProjectRootFromPort as defaultResolveProjectRootFromPort,
  type ProjectTargetResolution,
} from '../utils/projectTarget';

export interface PortDeps extends ExecDeps {
  resolveProjectRootFromPort?: (port: number) => Promise<ProjectTargetResolution>;
}

export const portCheck = {
  name: 'Port Check',

  async run(config: DevGuardConfig, deps: PortDeps = {}): Promise<CheckResult> {
    const start = performance.now();
    const listeners = await getListeningPortDetails(deps);
    const resolveTargetProject =
      deps.resolveProjectRootFromPort ??
      ((port: number) => defaultResolveProjectRootFromPort(port, deps));
    const occupied = Array.from(new Set(listeners.map((listener) => listener.port))).sort((a, b) => a - b);
    const durationMs = Math.round(performance.now() - start);
    const targetPort = config.targetPort;
    const targetListener = targetPort !== undefined ? listeners.find((listener) => listener.port === targetPort) : undefined;
    const targetResolution =
      targetPort !== undefined && targetListener
        ? await resolveTargetProject(targetPort)
        : null;
    const annotatedListeners = listeners.map((listener) => ({
      ...listener,
      isTarget: listener.port === targetPort,
    }));

    if (targetPort !== undefined) {
      if (targetListener) {
        if (targetResolution?.projectRoot) {
          return {
            name: 'Port Check',
            status: 'ok',
            message: `Port ${targetPort} is already in use by the target project`,
            details: {
              targetPort,
              targetOccupied: true,
              targetOwned: true,
              targetListener,
              targetProjectRoot: targetResolution.projectRoot,
              targetPid: targetResolution.pid,
              targetCommandLine: targetResolution.commandLine,
              occupied,
              listeners: annotatedListeners,
              total: occupied.length,
            },
            durationMs,
          };
        }

        return {
          name: 'Port Check',
          status: 'error',
          message: `Port ${targetPort} is already occupied by another process`,
          suggestion: `Stop ${targetListener.processName ?? 'the running process'} on port ${targetPort} or choose a different port`,
          details: {
            targetPort,
            targetOccupied: true,
            targetOwned: false,
            targetListener,
            targetPid: targetResolution?.pid ?? targetListener.pid ?? null,
            targetCommandLine: targetResolution?.commandLine ?? null,
            occupied,
            listeners: annotatedListeners,
            total: occupied.length,
          },
          durationMs,
        };
      }

      return {
        name: 'Port Check',
        status: 'ok',
        message: `Port ${targetPort} is available`,
        details: {
          targetPort,
          targetOccupied: false,
          targetOwned: false,
          occupied,
          listeners: annotatedListeners,
          total: occupied.length,
        },
        durationMs,
      };
    }

    if (occupied.length === 0) {
      return {
        name: 'Port Check',
        status: 'ok',
        message: 'No occupied TCP listening ports detected',
        details: { occupied, listeners: annotatedListeners, total: 0 },
        durationMs,
      };
    }

    return {
      name: 'Port Check',
      status: 'warning',
      message: `Detected ${occupied.length} occupied TCP listening port${occupied.length === 1 ? '' : 's'}`,
      suggestion: 'Stop the process using a conflicting port or change your app port before starting another service',
      details: { occupied, listeners: annotatedListeners, total: occupied.length },
      durationMs,
    };
  },
};
