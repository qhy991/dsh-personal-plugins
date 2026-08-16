/**
 * KerSor viewer browser half: sidebar run-inventory panel fed by the forwarded
 * `kersor/event` Host frames and the `kersorViewer` remote namespace.
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
/** Required services: slot registry, locale, and the assembled KerSor remotes. */
export declare const inject: string[];
/** Mount the KerSor viewer surfaces over the Host inventory and event stream. */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map