//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-kersor-viewer`.
* @module @deepseek-ai/dsh-kersor-viewer/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-kersor-viewer";
/** KerSor viewer companion plugin name. */
const name = "kersor-viewer-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: run folds and bounded artifact projections are verified
* by replay and assembled-browser tests. The viewer owns no cross-plugin
* mutable relation; worker detail frames cannot change run lifecycle or usage.
*/
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
