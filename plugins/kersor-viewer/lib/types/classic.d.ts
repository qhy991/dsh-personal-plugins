/**
 * Read-only adapter from the installed KerSor preset bridge to the viewer.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
import type { KersorDiagnosticIssue } from './diagnostics.ts';
export type KersorClassicLifecycle = 'active' | 'completed' | 'stalled' | 'cancelled';
export type KersorClassicHealth = 'active' | 'stale' | 'needs_resume' | 'terminal' | 'unknown';
export type KersorClassicStatus = 'terminal-complete' | 'terminal-stalled' | 'terminal-cancelled' | 'resumable' | 'in-progress' | 'pre-round-1';
/** One recent optimization Session projected by the canonical KerSor stores. */
export interface KersorClassicSession {
    readonly session_id: string;
    readonly session_dir: string;
    readonly storage_kind: 'v2' | 'legacy';
    readonly phase?: string | null;
    readonly lifecycle: KersorClassicLifecycle;
    readonly status: KersorClassicStatus;
    readonly health: KersorClassicHealth;
    readonly started_at?: string | null;
    readonly last_activity_at?: string | null;
    readonly current_round?: number | null;
    readonly max_workflows?: number | null;
    readonly target_speedup?: number | null;
    readonly target_met?: boolean | null;
    readonly mode?: string | null;
    readonly backend?: string | null;
    readonly kernel_language?: string | null;
    readonly integration_pattern?: string | null;
    readonly allow_workflow_authoring?: boolean | null;
    readonly workflow_authoring_budget?: number | null;
    readonly kernel_name?: string | null;
    readonly workflow?: string | null;
    /** Outcome of the deterministic selector, separate from a Workflow name. */
    readonly selection_status?: 'pending' | 'stalled' | 'selected' | null;
    /** Latest canonical COMPLETE/CONTINUE/STALLED line, when a round has decided. */
    readonly decision?: string | null;
    readonly fit_confidence?: string | null;
    readonly best_speedup?: number | null;
    readonly warningCount: number;
}
/** Stable stage identifiers rendered by the classic Session inspector. */
export type KersorClassicStepId = 'setup' | 'baseline' | 'profile' | 'selection' | 'authoring' | 'validation' | 'dispatch' | 'measurement' | 'decision';
/** Artifact-derived lifecycle of one inspector stage. */
export type KersorClassicStepStatus = 'pending' | 'active' | 'completed' | 'failed';
/** One artifact-derived step in a classic optimization Session. */
export interface KersorClassicStep {
    readonly id: KersorClassicStepId;
    readonly status: KersorClassicStepStatus;
}
/** Selector outcome kept separate from authored or released Workflow identity. */
export interface KersorClassicSelectionDetail {
    readonly status: 'pending' | 'stalled' | 'selected';
    readonly workflow?: string;
    readonly reason?: string;
    readonly rejectedCount: number;
}
/** One sealed or persisted Workflow file. */
export interface KersorClassicArtifact {
    readonly name: string;
    readonly sha256: string;
    readonly bytes: number;
}
/** Curated routing metadata plus sealed, read-only design text. */
export interface KersorClassicWorkflowDesign {
    readonly name?: string;
    readonly technique?: string;
    readonly methodCategory?: string;
    readonly topology?: string;
    readonly requiredArgs: readonly string[];
    readonly languages: readonly string[];
    readonly backends: readonly string[];
    readonly integrationPatterns: readonly string[];
    readonly rationale: string;
    readonly source: string;
}
/** Foreground authoring state. Design content is absent until the handoff is sealed. */
export interface KersorClassicAuthoringDetail {
    readonly status: 'not_started' | 'in_progress' | 'sealed' | 'saved' | 'rejected';
    readonly files: readonly KersorClassicArtifact[];
    readonly design?: KersorClassicWorkflowDesign;
    readonly omittedReason?: 'too_large' | 'invalid' | 'hash_mismatch';
}
/** One deterministic Proposal validation result. */
export interface KersorClassicValidationCheck {
    readonly name: string;
    readonly passed: boolean;
}
/** Bounded result of the canonical Proposal save validator. */
export interface KersorClassicValidationDetail {
    readonly status: 'pending' | 'passed' | 'failed';
    readonly checks: readonly KersorClassicValidationCheck[];
}
/** Dispatch preparation and Workflow Host lifecycle for the current round. */
export interface KersorClassicDispatchDetail {
    readonly status: 'pending' | 'preparing' | 'running' | 'completed' | 'failed';
    readonly runDir?: string;
    readonly runtimeStatus?: string;
}
/** On-demand inspector projection for one already-discovered classic Session. */
export interface KersorClassicSessionDetail {
    readonly session_id: string;
    readonly session_dir: string;
    readonly current_round: number;
    readonly steps: readonly KersorClassicStep[];
    readonly selection: KersorClassicSelectionDetail;
    readonly authoring: KersorClassicAuthoringDetail;
    readonly validation: KersorClassicValidationDetail;
    readonly dispatch: KersorClassicDispatchDetail;
}
/** Health of the optional classic-Session bridge. */
export interface KersorClassicSource {
    readonly state: 'disabled' | 'not_installed' | 'healthy' | 'degraded' | 'failed';
    readonly lastIssue?: KersorDiagnosticIssue;
}
/** Bounded recent-session inventory and its structured source state. */
export interface KersorClassicSnapshot {
    readonly sessions: readonly KersorClassicSession[];
    readonly source: KersorClassicSource;
}
/** Machine-local roots supplied by viewer configuration and DSH workspaces. */
export interface KersorClassicRoots {
    readonly includeCheckoutRoot?: boolean;
    readonly sessionRoots?: readonly string[];
    readonly workspaceRoots?: readonly string[];
}
/** Path copied by the portable preset installer. */
export declare function installedBridge(): string;
/**
 * Read a sealed, bounded inspector projection for one classic Session.
 * @param sessionDir - Exact Session directory already discovered by the Host.
 * @returns Valid detail, or `undefined` when the bridge cannot provide it.
 */
export declare function readClassicSessionDetail(sessionDir: string): Promise<KersorClassicSessionDetail | undefined>;
/** Invoke the installed bridge without a shell and return a bounded snapshot. */
export declare function readClassicSessions(limit: number, staleAfterSeconds?: number, roots?: KersorClassicRoots): Promise<KersorClassicSnapshot>;
//# sourceMappingURL=classic.d.ts.map