/**
 * KerSor viewer browser half: one atomic Host snapshot plus optional launcher
 * process ownership, rendered in the sidebar.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */
import { KersorPanel } from "./KersorPanel.js";
import { KersorViewerStore } from "./store.js";
import { en, NS, zh } from "./locales.js";
export { KersorViewerStore as KersorViewerStoreClass } from "./store.js";
export { NS };
/** Required services: viewer UI seams, assembled Remotes, and Host inventory. */
export const inject = ['slots', 'locale', 'remote', 'remote.pluginInventory'];
/** Mount the KerSor viewer surfaces over the API assembly's Remote namespaces. */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'kersor-viewer: dictionaries');
    const store = new KersorViewerStore();
    const launcherRemote = () => ctx.get('remote.kersor');
    const viewerRemote = () => {
        const remote = ctx.get('remote.kersorViewer');
        if (remote === undefined)
            throw new Error('KerSor viewer Remote is not mounted');
        return remote;
    };
    const launcherHostAvailable = async () => {
        const answered = await ctx.remote.pluginInventory.list();
        if (!answered.ok)
            return false;
        return answered.value.entries.some(entry => entry.moduleName === '@deepseek-ai/dsh-kersor'
            && entry.enabled
            && entry.fiberPhase === 'active');
    };
    const refreshViewer = async () => {
        try {
            const remote = viewerRemote();
            const answered = await remote.snapshot();
            if (!answered.ok) {
                store.setTransportError(`${answered.error.code}: ${answered.error.message}`);
                return;
            }
            store.setSnapshot(answered.value);
            const selected = store.selectedRunDir;
            if (selected !== undefined) {
                const backlog = await remote.runBacklog(selected);
                if (!backlog.ok) {
                    store.setTransportError(`${backlog.error.code}: ${backlog.error.message}`);
                    return;
                }
                store.setBacklog(selected, backlog.value);
            }
        }
        catch (error) {
            store.setTransportError(error instanceof Error ? error.message : String(error));
        }
    };
    const refreshLauncher = async () => {
        try {
            const launcher = launcherRemote();
            if (!await launcherHostAvailable() || launcher === undefined) {
                store.setLauncherUnavailable();
                return;
            }
            const [tasks, active] = await Promise.all([
                launcher.listTasks(),
                launcher.listActive(),
            ]);
            if (!tasks.ok || !active.ok) {
                store.setLauncherUnavailable();
                return;
            }
            store.setLauncher(tasks.value, active.value);
        }
        catch {
            // Optional launcher discovery must not disable the read-only viewer.
            store.setLauncherUnavailable();
        }
    };
    const refresh = async () => {
        await Promise.all([refreshViewer(), refreshLauncher()]);
    };
    const start = async (taskId) => {
        try {
            const launcher = launcherRemote();
            if (!await launcherHostAvailable() || launcher === undefined) {
                store.setLauncherUnavailable();
                return;
            }
            const answered = await launcher.start(taskId);
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
            const launcher = launcherRemote();
            if (!await launcherHostAvailable() || launcher === undefined) {
                store.setLauncherUnavailable();
                return;
            }
            const answered = await launcher.stop(runDir);
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
    ctx.on('connection/reset', () => {
        store.reset();
        void refresh();
    });
    ctx.remote.$on('kersor/event', (frame) => {
        store.applyFrame(frame);
    });
    ctx.remote.$on('kersor/active', (frame) => {
        store.applyActiveFrame(frame);
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