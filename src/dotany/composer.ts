import { ApplyResult, StatusResult } from './types.js';
import { DotfileManager } from './manager.js';

/**
 * Compose multiple DotfileManagers, applying them in order.
 * Later managers override earlier ones for the same alias.
 */
export class DotfileComposer {
    constructor(private managers: DotfileManager[]) {}

    async apply(): Promise<ApplyResult[]> {
        const results: ApplyResult[] = [];
        for (const manager of this.managers) {
            results.push(await manager.apply());
        }
        return results;
    }

    async status(): Promise<StatusResult[]> {
        const results: StatusResult[] = [];
        for (const manager of this.managers) {
            results.push(await manager.status());
        }
        return results;
    }
}
