/**
 * Root-directory discovery of KerSor autonomous runs. A root is scanned for
 * Session-v2 directories (`session-config.json` + `state.json`) that carry an
 * `autonomous-runs/` child; each child directory is one run.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
/** Default roots scanned in addition to configured ones. */
export declare const DEFAULT_KERSOR_ROOTS: string[];
/** Lifecycle classification of one discovered run directory. */
export type KersorRunDiscovery = 'active' | 'completed' | 'failed';
/** One discovered run: identity paths plus classification. */
export interface KersorRunRef {
    readonly runId: string;
    readonly runDir: string;
    readonly sessionDir: string;
    readonly root: string;
    readonly discovery: KersorRunDiscovery;
}
/**
 * Scan every root (deduplicated) for KerSor runs.
 * @param roots - configured roots; defaults are appended when `includeDefaults`.
 * @param workspaceRoots - DSH project directories whose `.kersor/` children are scanned.
 * @returns run refs; ordering is unspecified (the service sorts for display).
 */
export declare function scanRoots(roots: readonly string[], includeDefaults: boolean, workspaceRoots?: readonly string[]): Promise<KersorRunRef[]>;
//# sourceMappingURL=scanner.d.ts.map