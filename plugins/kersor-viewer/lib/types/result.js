/** Bounded projection of a Workflow Host output for browser visualization. */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_CANDIDATES = 20;
function optionalString(value) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
function optionalNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
/**
 * Read one canonical output without forwarding candidate source or arbitrary report text.
 * @param runDir - Exact discovered run directory.
 * @returns Bounded candidate-selection facts, or `undefined` when absent or invalid.
 */
export async function readWorkflowResult(runDir) {
    const file = path.join(runDir, 'output.json');
    try {
        const info = await stat(file);
        if (!info.isFile() || info.size > MAX_OUTPUT_BYTES)
            return undefined;
        const decoded = JSON.parse(await readFile(file, 'utf8'));
        if (decoded === null || typeof decoded !== 'object' || Array.isArray(decoded))
            return undefined;
        const value = decoded;
        const rawCandidates = Array.isArray(value.candidate_log) ? value.candidate_log : [];
        const candidates = rawCandidates.slice(0, MAX_CANDIDATES).flatMap((candidate) => {
            if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate))
                return [];
            const row = candidate;
            const id = optionalString(row.candidate_id);
            if (id === undefined)
                return [];
            const expectedCycles = optionalNumber(row.expected_cycles);
            return [{ id, ...(expectedCycles === undefined ? {} : { expectedCycles }) }];
        });
        const stage = optionalString(value.arch_stage);
        const selectedCandidateId = optionalString(value.selected_candidate_id);
        const expectedCycles = optionalNumber(value.expected_cycles_estimate);
        const estimatedSpeedup = optionalNumber(value.estimated_speedup);
        const measured = value.overall_speedup;
        const measuredSpeedup = measured === null ? null : optionalNumber(measured);
        if (stage === undefined && selectedCandidateId === undefined && expectedCycles === undefined
            && estimatedSpeedup === undefined && measuredSpeedup === undefined && candidates.length === 0)
            return undefined;
        return {
            ...(stage === undefined ? {} : { stage }),
            ...(selectedCandidateId === undefined ? {} : { selectedCandidateId }),
            ...(expectedCycles === undefined ? {} : { expectedCycles }),
            ...(estimatedSpeedup === undefined ? {} : { estimatedSpeedup }),
            ...(measuredSpeedup === undefined ? {} : { measuredSpeedup }),
            candidates,
        };
    }
    catch {
        // Missing or invalid optional output leaves runtime progress usable.
        return undefined;
    }
}
//# sourceMappingURL=result.js.map