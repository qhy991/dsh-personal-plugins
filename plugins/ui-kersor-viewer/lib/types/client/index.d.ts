/**
 * KerSor viewer browser half: sidebar run-inventory panel refreshed through
 * generated viewer and optional launcher Remote namespaces.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { NS } from './locales.ts';
import type { KersorViewerKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** KerSor viewer panel copy. */
        kersorViewer: KersorViewerKey;
    }
}
export type { KersorPanelFace } from './slots.ts';
export type { KersorViewerState, KersorViewerStore, KersorRunRow } from './store.ts';
export { KersorViewerStore as KersorViewerStoreClass } from './store.ts';
export { NS };
export type { KersorViewerKey } from './locales.ts';
/** Required services: viewer UI seams and the generic Remote carrier. */
export declare const inject: string[];
/** Mount the KerSor viewer surfaces over Host snapshot remotes. */
export declare function apply(ctx: ClientContext): Promise<() => Promise<void>>;
//# sourceMappingURL=index.d.ts.map
