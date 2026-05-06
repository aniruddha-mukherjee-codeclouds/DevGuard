import type { CheckModule } from '../types';
import { portCheck } from '../checks/portCheck';
import { envCheck } from '../checks/envCheck';
import { nodeCheck } from '../checks/nodeCheck';
import { processCheck } from '../checks/processCheck';

export const registry: CheckModule[] = [portCheck, envCheck, nodeCheck, processCheck];
