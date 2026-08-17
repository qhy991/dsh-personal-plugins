/**
 * KerSor viewer browser half: sidebar run-inventory panel refreshed through
 * generated viewer and optional launcher Remote namespaces.
 * @module @deepseek-ai/dsh-client-ui-kersor-viewer/client
 */
import launcherContribution from '@deepseek-ai/dsh-kersor/remote';
import viewerContribution from '@deepseek-ai/dsh-kersor-viewer/remote';
import { KersorPanel } from "./KersorPanel.js";
import { KersorViewerStore } from "./store.js";
import { en, NS, zh } from "./locales.js";
export { KersorViewerStore as KersorViewerStoreClass } from "./store.js";
export { NS };
/** Required services: viewer UI seams and the generic Remote carrier. */
export const inject = ['slots', 'locale', 'remote'];
/** Mount the KerSor viewer surfaces over Host snapshot remotes. */
export async function apply(ctx) {
    // Own the generated contributions here so a third-party install does not
    // need to edit dsh's core Remote assembly. The viewer is required; the
    // launcher remains optional and hides its controls after an unavailable call.
    const remoteDisposers = [await ctx.remote.$mount(viewerContribution)];
    try {
        remoteDisposers.push(await ctx.remote.$mount(launcherContribution));
    }
    catch {
        // Read-only viewer mode remains useful without a launcher namespace.
    }
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'kersor-viewer: dictionaries');
    const store = new KersorViewerStore();
    const launcherRemote = () => ctx.get('remote.kersor');
    const viewerRemote = () => {
        const remote = ctx.get('remote.kersorViewer');
        if (remote === undefined)
            throw new Error('KerSor viewer Remote is not mounted');
        return remote;
    };
    const refreshViewer = async () => {
        try {
            const remote = viewerRemote();
            const [answered, classic] = await Promise.all([
                remote.listRuns(),
                remote.listClassicSessions(),
            ]);
            if (!answered.ok)
                store.setError(`${answered.error.code}: ${answered.error.message}`);
            else
                store.setInventory(answered.value);
            if (!classic.ok)
                store.setClassicWarning(`${classic.error.code}: ${classic.error.message}`);
            else
                store.setClassic(classic.value);
            if (!answered.ok)
                return;
            const selected = store.selectedRunDir;
            if (selected !== undefined) {
                const backlog = await remote.runBacklog(selected);
                if (backlog.ok)
                    store.setBacklog(selected, backlog.value);
            }
        }
        catch (error) {
            store.setError(error instanceof Error ? error.message : String(error));
        }
    };
    const refreshLauncher = async () => {
        const launcher = launcherRemote();
        if (launcher === undefined) {
            store.setLauncherUnavailable();
            return;
        }
        try {
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
            store.setLauncherUnavailable();
        }
    };
    const refresh = async () => {
        await Promise.all([refreshViewer(), refreshLauncher()]);
    };
    const start = async (taskId) => {
        const launcher = launcherRemote();
        if (launcher === undefined) {
            store.setLauncherUnavailable();
            return;
        }
        try {
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
        const launcher = launcherRemote();
        if (launcher === undefined) {
            store.setLauncherUnavailable();
            return;
        }
        try {
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
    ctx.effect(() => {
        void refresh();
        const timer = setInterval(() => { void refresh(); }, 2000);
        return () => { clearInterval(timer); };
    }, 'kersor-viewer: remote snapshot polling');
    const face = { store, refresh, start, stop };
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'kersor-panel',
        locale: NS,
        inject: () => face,
    }, KersorPanel));
    return async () => {
        for (const dispose of remoteDisposers.reverse())
            await dispose();
    };
}
//# sourceMappingURL=index.js.map