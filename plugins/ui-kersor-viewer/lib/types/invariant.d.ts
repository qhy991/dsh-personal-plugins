/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-kersor-viewer`.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/invariant
 */
import type { Context } from '@deepseek-ai/cordis';
/** KerSor viewer companion plugin name. */
export declare const name = "client-ui-kersor-viewer-invariant";
/** Service required before the companion can reserve package ownership. */
export declare const inject: string[];
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export declare const apply: (ctx: Context) => Promise<() => void>;
//# sourceMappingURL=invariant.d.ts.map