/** Bounded projection of a Workflow Host output for browser visualization. */
import type { KersorWorkflowResultView } from './fold.ts';
/**
 * Read one canonical output without forwarding candidate source or arbitrary report text.
 * @param runDir - Exact discovered run directory.
 * @returns Bounded candidate-selection facts, or `undefined` when absent or invalid.
 */
export declare function readWorkflowResult(runDir: string): Promise<KersorWorkflowResultView | undefined>;
//# sourceMappingURL=result.d.ts.map