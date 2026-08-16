/**
 * KerSor viewer browser half: sidebar run-inventory panel fed by the forwarded
 * `kersor/event` Host frames and the `kersorViewer` remote namespace.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */
import { KersorPanel } from "./KersorPanel.js";
import { KersorViewerStore } from "./store.js";
import { en, NS, zh } from "./locales.js";
export { KersorViewerStore as KersorViewerStoreClass } from "./store.js";
export { NS };
/** Required services: slot registry, locale, and the assembled KerSor remotes. */
export const inject = ['slots', 'locale', 'remote', 'remote.kersor', 'remote.kersorViewer'];
/** Mount the KerSor viewer surfaces over the Host inventory and event stream. */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'kersor-viewer: dictionaries');
    const store = new KersorViewerStore();
    const refreshViewer = async () => {
        try {
            const answered = await ctx.remote.kersorViewer.listRuns();
            if (!answered.ok) {
                store.setError(`${answered.error.code}: ${answered.error.message}`);
                return;
            }
            store.setInventory(answered.value);
            const selected = store.selectedRunDir;
            if (selected !== undefined) {
                const backlog = await ctx.remote.kersorViewer.runBacklog(selected);
                if (backlog.ok)
                    store.setBacklog(selected, backlog.value);
            }
        }
        catch (error) {
            store.setError(error instanceof Error ? error.message : String(error));
        }
    };
    const refreshLauncher = async () => {
        try {
            const [tasks, active] = await Promise.all([
                ctx.remote.kersor.listTasks(),
                ctx.remote.kersor.listActive(),
            ]);
            if (!tasks.ok || !active.ok) {
                store.setLauncherUnavailable();
                return;
            }
            store.setLauncher(tasks.value, active.value);
        }
        catch {
            store.setLauncherUnavailable();
        }
    };
    const refresh = async () => {
        await Promise.all([refreshViewer(), refreshLauncher()]);
    };
    const start = async (taskId) => {
        try {
            const answered = await ctx.remote.kersor.start(taskId);
            if (!answered.ok) {
                store.setLauncherError(`${answered.error.code}: ${answered.error.message}`);
                return;
            }
            await refreshLauncher();
            await refreshViewer();
        }
        catch (error) {
            store.setLauncherError(error instanceof Error ? error.message : String(error));
        }
    };
    const stop = async (runDir) => {
        try {
            const answered = await ctx.remote.kersor.stop(runDir);
            if (!answered.ok) {
                store.setLauncherError(`${answered.error.code}: ${answered.error.message}`);
                return;
            }
            await refreshLauncher();
            await refreshViewer();
        }
        catch (error) {
            store.setLauncherError(error instanceof Error ? error.message : String(error));
        }
    };
    ctx.remote.$on('kersor/event', (frame) => {
        store.applyFrame(frame);
    });
    ctx.remote.$on('kersor/active', (frame) => {
        store.applyActiveFrame(frame);
    });
    ctx.on('connection/reset', () => {
        store.reset();
        void refresh();
    });
    void refresh();
    const face = { store, refresh, start, stop };
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'kersor-panel',
        locale: NS,
        inject: () => face,
    }, KersorPanel));
}
//# sourceMappingURL=index.js.map