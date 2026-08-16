/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-kersor`.
 * @module @deepseek-ai/dsh-kersor/invariant
 */
const PACKAGE_NAME = '@deepseek-ai/dsh-kersor';
/** KerSor launcher companion plugin name. */
export const name = 'kersor-invariant';
/** Services required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/** Every active-launch frame requires the service that owns those processes. */
const install = (ctx, fail) => {
    ctx.on('kersor/active', () => {
        if (ctx.get('kersor') === undefined)
            fail('kersor/active emitted without a live KerSor launcher');
    });
};
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map