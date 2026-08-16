/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-kersor-viewer`.
 * @module @deepseek-ai/dsh-kersor-viewer/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-kersor-viewer';
/** KerSor viewer companion plugin name. */
export const name = 'kersor-viewer-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: the viewer's one owned relation — each tracked run's
 * folded view matching the events consumed from its `events.jsonl` — is
 * verified behaviorally by the fold spec replaying full event sequences; the
 * service holds no cross-plugin state other than that fold and emits only the
 * `kersor/event` frames derived from it.
 */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
//# sourceMappingURL=invariant.js.map