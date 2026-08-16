/**
 * KerSor viewer host service: discovers run directories under configured
 * KerSor roots, tails each active run's `events.jsonl`, folds events into the
 * viewer view model, and pushes updates to every browser page through the
 * forwarded `kersor/event` Host event.
 * @module @deepseek-ai/dsh-kersor-viewer
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { createRunView, foldEvent } from "./fold.js";
import { scanRoots } from "./scanner.js";
import { EventsTailer } from "./tailer.js";
export { EventsTailer } from "./tailer.js";
export { DEFAULT_KERSOR_ROOTS, scanRoots } from "./scanner.js";
export { createRunView, foldEvent } from "./fold.js";
/**
 * Host service: run inventory, live event folding, and browser push. Exposes
 * `listRuns` and `runBacklog` remotes for panel open and reconnect.
 */
let KersorViewerService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _listRuns_decorators;
    let _runBacklog_decorators;
    return class KersorViewerService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _listRuns_decorators = [Remote('listRuns')];
            _runBacklog_decorators = [Remote('runBacklog')];
            __esDecorate(this, null, _listRuns_decorators, { kind: "method", name: "listRuns", static: false, private: false, access: { has: obj => "listRuns" in obj, get: obj => obj.listRuns }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _runBacklog_decorators, { kind: "method", name: "runBacklog", static: false, private: false, access: { has: obj => "runBacklog" in obj, get: obj => obj.runBacklog }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static Config = z.object({
            roots: z.array(z.string()).default([]),
            noDefaultRoots: z.boolean().default(false),
            scanIntervalMs: z.number().min(500).default(5000),
        });
        rootCtx = __runInitializers(this, _instanceExtraInitializers);
        configuredRoots;
        includeDefaults;
        scanIntervalMs;
        tracked = new Map();
        group;
        scanTimer;
        emittedRunsSignature = '';
        /** Create the service under the Host composition. */
        constructor(ctx, config) {
            super(ctx, 'kersorViewer');
            this.rootCtx = ctx;
            this.configuredRoots = config.roots ?? [];
            this.includeDefaults = !(config.noDefaultRoots ?? false);
            this.scanIntervalMs = config.scanIntervalMs ?? 5000;
        }
        /** Start discovery and tailing under the plugin's fiber once ready. */
        *[Service.init]() {
            yield () => {
                // Teardown: stop every tailer and the scan loop; the group fiber's own
                // disposers (registered via group.effect below) run on group dispose.
                for (const tracked of this.tracked.values())
                    tracked.tailer?.stop();
                this.tracked.clear();
                if (this.scanTimer !== undefined)
                    clearInterval(this.scanTimer);
                this.scanTimer = undefined;
                void this.group?.dispose();
                this.group = undefined;
            };
            const group = this.requireGroup();
            group.effect(() => {
                void this.rescan();
                this.scanTimer = setInterval(() => { void this.rescan(); }, this.scanIntervalMs);
                this.scanTimer.unref();
                return () => {
                    if (this.scanTimer !== undefined)
                        clearInterval(this.scanTimer);
                    this.scanTimer = undefined;
                };
            });
        }
        requireGroup() {
            this.group ??= this.rootCtx.plugin({ name: 'kersor-viewer-group', apply: () => { } });
            return this.group;
        }
        /** Inventory snapshot for the panel's run list. */
        listRuns() {
            return [...this.tracked.values()].map(tracked => tracked.ref)
                .sort((left, right) => rank(right) - rank(left) || right.runId.localeCompare(left.runId));
        }
        /** Full folded view of one run (panel open / reconnect backlog). */
        runBacklog(runDir) {
            return this.tracked.get(runDir)?.view;
        }
        /** Rescan roots; start and stop tailers to match discovery. */
        async rescan() {
            const found = await scanRoots(this.configuredRoots, this.includeDefaults);
            const byRunDir = new Map(found.map(ref => [ref.runDir, ref]));
            for (const [runDir, tracked] of this.tracked) {
                if (byRunDir.has(runDir))
                    continue;
                tracked.tailer?.stop();
                this.tracked.delete(runDir);
            }
            for (const ref of found) {
                const existing = this.tracked.get(ref.runDir);
                if (existing !== undefined) {
                    if (existing.ref.discovery !== ref.discovery) {
                        // Lifecycle is monotonic. A summary can be momentarily unreadable
                        // while it is replaced, but a terminal run must not become active
                        // again because of that transient scan result.
                        if (existing.ref.discovery !== 'active' && ref.discovery === 'active')
                            continue;
                        existing.ref = ref;
                        if (ref.discovery !== 'active') {
                            existing.tailer?.stop();
                            existing.tailer = undefined;
                            // A waiting summary is terminal even when the event stream has no
                            // workflow.completed frame. Summary-backed discovery is the
                            // authoritative lifecycle shown in the inventory.
                            existing.view.status = terminalStatus(ref);
                            this.rootCtx.emit('kersor/event', { kind: 'run', run: existing.view });
                        }
                        else {
                            this.attachTailer(existing);
                        }
                    }
                    continue;
                }
                const view = createRunView(ref.runId, ref.runDir, ref.sessionDir);
                const tracked = { ref, view, tailer: undefined };
                this.tracked.set(ref.runDir, tracked);
                if (ref.discovery === 'active')
                    this.attachTailer(tracked);
                else
                    void this.backfillTerminated(tracked);
            }
            const signature = found.map(ref => `${ref.runDir}:${ref.discovery}`).sort().join('|');
            if (signature !== this.emittedRunsSignature) {
                this.emittedRunsSignature = signature;
                this.rootCtx.emit('kersor/event', { kind: 'runs', runs: this.listRuns() });
            }
        }
        /** Read a discovered-terminated run's full event log once (no tailer). */
        async backfillTerminated(tracked) {
            const { ref, view } = tracked;
            let text;
            try {
                text = await (await import('node:fs/promises')).readFile(`${ref.runDir}/.runtime/events.jsonl`, 'utf8');
            }
            catch {
                return; // no event log (e.g. crashed before the first flush): empty view
            }
            for (const line of text.split('\n')) {
                if (line.length === 0)
                    continue;
                try {
                    foldEvent(view, JSON.parse(line));
                }
                catch {
                    // partial or non-JSON line: skip
                }
            }
            if (view.status !== 'completed' && view.status !== 'failed') {
                view.status = terminalStatus(ref);
            }
            if (this.tracked.get(ref.runDir) !== tracked)
                return;
            this.rootCtx.emit('kersor/event', { kind: 'run', run: view });
        }
        attachTailer(tracked) {
            if (tracked.tailer !== undefined)
                return;
            const { ref, view } = tracked;
            const eventsFile = `${ref.runDir}/.runtime/events.jsonl`;
            const tailer = new EventsTailer(eventsFile, (lines) => {
                let mutated = false;
                for (const line of lines) {
                    let event;
                    try {
                        event = JSON.parse(line);
                    }
                    catch {
                        continue; // partial or non-JSON line: skip
                    }
                    mutated = true;
                    foldEvent(view, event);
                }
                if (mutated)
                    this.rootCtx.emit('kersor/event', { kind: 'run', run: view });
                if (view.status === 'completed' || view.status === 'failed') {
                    tracked.ref = { ...tracked.ref, discovery: view.status };
                    tailer.stop();
                }
            }, () => {
                if (tracked.tailer === tailer)
                    tracked.tailer = undefined;
            });
            tracked.tailer = tailer;
            tailer.start();
        }
    };
})();
export { KersorViewerService };
function rank(ref) {
    if (ref.discovery === 'active')
        return 2;
    if (ref.discovery === 'failed')
        return 1;
    return 0;
}
function terminalStatus(ref) {
    return ref.discovery === 'failed' ? 'failed' : 'completed';
}
/** Cordis plugin entry: the service class itself (class plugin, default export). */
export default KersorViewerService;
//# sourceMappingURL=service.js.map