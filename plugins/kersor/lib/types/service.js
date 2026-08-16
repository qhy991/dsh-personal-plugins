/**
 * KerSor launcher service. Config registers the only Mission files a remote
 * caller may start; KerSor remains the owner of Mission validation, run files,
 * workflow state, resume semantics, and results.
 * @module @deepseek-ai/dsh-kersor
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
import { randomUUID } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024;
const DEFAULT_STOP_GRACE_MS = 3_000;
const RUNNER_RELATIVE_PATH = 'scripts/run-autonomous-workflow.py';
/** Host-side launcher over registered KerSor autonomous Missions. */
let KersorService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _listTasks_decorators;
    let _listActive_decorators;
    let _start_decorators;
    let _stop_decorators;
    return class KersorService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _listTasks_decorators = [Remote('listTasks')];
            _listActive_decorators = [Remote('listActive')];
            _start_decorators = [Remote('start')];
            _stop_decorators = [Remote('stop')];
            __esDecorate(this, null, _listTasks_decorators, { kind: "method", name: "listTasks", static: false, private: false, access: { has: obj => "listTasks" in obj, get: obj => obj.listTasks }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listActive_decorators, { kind: "method", name: "listActive", static: false, private: false, access: { has: obj => "listActive" in obj, get: obj => obj.listActive }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _start_decorators, { kind: "method", name: "start", static: false, private: false, access: { has: obj => "start" in obj, get: obj => obj.start }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _stop_decorators, { kind: "method", name: "stop", static: false, private: false, access: { has: obj => "stop" in obj, get: obj => obj.stop }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['credentials', 'subprocess'];
        static Config = z.object({
            root: z.string().required(),
            python: z.string().default('python3'),
            tasks: z.array(z.object({
                id: z.string().required(),
                label: z.string().required(),
                mission: z.string().required(),
                runtimeConfig: z.string(),
            })).min(1).required(),
            credentialRefs: z.array(z.string()).default([]),
            env: z.dict(z.string()).default({}),
            maxOutputBytes: z.number().step(1).min(1).default(DEFAULT_MAX_OUTPUT_BYTES),
            stopGraceMs: z.number().step(1).min(1).default(DEFAULT_STOP_GRACE_MS),
        });
        root = __runInitializers(this, _instanceExtraInitializers);
        runner;
        python;
        tasks;
        credentialRefs;
        env;
        maxOutputBytes;
        stopGraceMs;
        active = new Map();
        stopping = false;
        /** Resolve config once; asynchronous executable and file checks run during init. */
        constructor(ctx, config) {
            super(ctx, 'kersor');
            this.root = absolute(config.root, 'root');
            this.runner = path.join(this.root, RUNNER_RELATIVE_PATH);
            this.python = config.python ?? 'python3';
            this.credentialRefs = (config.credentialRefs ?? []).map(credentialRef);
            this.env = { ...(config.env ?? {}) };
            this.maxOutputBytes = config.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
            this.stopGraceMs = config.stopGraceMs ?? DEFAULT_STOP_GRACE_MS;
            this.tasks = new Map();
            for (const task of config.tasks) {
                if (this.tasks.has(task.id))
                    throw new Error(`kersor: duplicate task id ${JSON.stringify(task.id)}`);
                const id = task.id;
                this.tasks.set(task.id, {
                    ref: { id, label: task.label },
                    mission: absolute(task.mission, `mission for task ${JSON.stringify(task.id)}`),
                    ...task.runtimeConfig === undefined
                        ? {}
                        : { runtimeConfig: absolute(task.runtimeConfig, `runtimeConfig for task ${JSON.stringify(task.id)}`) },
                });
            }
        }
        /** Validate self-contained configuration and quiesce every owned launch on disposal. */
        async *[Service.init]() {
            await this.ctx.subprocess.resolveExecutable(this.python, this.env);
            await access(this.runner);
            await Promise.all([...this.tasks.values()].flatMap(task => [
                access(task.mission),
                ...task.runtimeConfig === undefined ? [] : [access(task.runtimeConfig)],
            ]));
            yield async () => {
                this.stopping = true;
                const launches = [...this.active.values()];
                for (const launch of launches)
                    launch.handle.terminate();
                await Promise.allSettled(launches.map(launch => launch.settled));
                await Promise.allSettled(launches.map(launch => launch.handle.waitForExit()));
                this.active.clear();
            };
        }
        /**
         * Return the configured Mission registry without exposing host paths.
         * @returns tasks in configuration order.
         */
        listTasks() {
            return [...this.tasks.values()].map(task => task.ref);
        }
        /**
         * Return launcher processes dsh still owns.
         * @returns active launch receipts in start order.
         */
        listActive() {
            return [...this.active.values()].map(launch => launch.ref);
        }
        /**
         * Start one configured Mission and return after the process tree is owned.
         * Workflow completion is observed through `dsh-kersor-viewer`, not this receipt.
         * @param taskId - configured task identity from {@link listTasks}.
         * @returns active launcher receipt, including the deterministic run directory.
         * @throws when config, credentials, Mission routing, or process spawn is invalid.
         */
        async start(taskId) {
            if (this.stopping)
                throw new Error('kersor: launcher is stopping');
            const task = this.tasks.get(taskId);
            if (task === undefined)
                throw new Error(`kersor: unknown configured task ${JSON.stringify(taskId)}`);
            const routing = await readMissionRouting(task.mission);
            const runId = createRunId(taskId);
            const runDir = path.join(routing.session, 'autonomous-runs', runId);
            const explicitEnv = await this.resolveEnvironment();
            const python = await this.ctx.subprocess.resolveExecutable(this.python, explicitEnv);
            const argv = [
                python,
                this.runner,
                '--session', routing.session,
                '--mission', task.mission,
                '--run-id', runId,
                '--runtime', routing.runtime,
                '--project-root', routing.workspace,
                ...task.runtimeConfig === undefined ? [] : ['--runtime-config', task.runtimeConfig],
            ];
            const handle = this.ctx.subprocess.spawn({
                argv,
                cwd: this.root,
                env: explicitEnv,
                stdio: {
                    stdin: 'ignore',
                    stdout: { maxBytes: this.maxOutputBytes },
                    stderr: { maxBytes: this.maxOutputBytes },
                },
                graceMs: this.stopGraceMs,
            });
            const ref = {
                taskId,
                runId,
                runDir,
                startedTs: new Date().toISOString(),
                pid: handle.pid,
            };
            const owned = { ref, handle, settled: Promise.resolve() };
            owned.settled = handle.done.then((outcome) => { this.finish(owned, outcome.exitCode === 0 ? undefined : `exit ${String(outcome.exitCode)}`); }, (error) => { this.finish(owned, error instanceof Error ? error.message : String(error)); });
            this.active.set(runDir, owned);
            this.emitActive();
            return ref;
        }
        /**
         * Terminate one process tree and wait for quiescence.
         * @param runDir - exact run directory returned by {@link start}.
         * @returns false when this service does not own that run.
         */
        async stop(runDir) {
            const launch = this.active.get(runDir);
            if (launch === undefined)
                return false;
            launch.handle.terminate();
            await launch.settled;
            await launch.handle.waitForExit();
            return true;
        }
        async resolveEnvironment() {
            const env = { ...this.env };
            for (const ref of this.credentialRefs) {
                const resolved = await this.ctx.credentials.resolve(ref);
                if (resolved === undefined)
                    throw new Error(`kersor: credential ${JSON.stringify(ref)} is not configured`);
                env[ref] = resolved.value;
            }
            return env;
        }
        finish(launch, failure) {
            if (this.active.get(launch.ref.runDir) !== launch)
                return;
            this.active.delete(launch.ref.runDir);
            if (failure !== undefined)
                this.ctx.logger.warn('kersor: launcher for %s ended with %s', launch.ref.runId, failure);
            if (!this.stopping)
                this.emitActive();
        }
        emitActive() {
            this.ctx.emit('kersor/active', {
                kind: 'active',
                launches: this.listActive(),
            });
        }
    };
})();
export { KersorService };
function absolute(value, field) {
    if (!path.isAbsolute(value))
        throw new Error(`kersor: ${field} must be an absolute path`);
    return path.resolve(value);
}
async function readMissionRouting(mission) {
    let value;
    try {
        value = JSON.parse(await readFile(mission, 'utf8'));
    }
    catch (error) {
        throw new Error(`kersor: cannot read Mission routing from ${mission}`, { cause: error });
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`kersor: Mission must be a JSON object: ${mission}`);
    }
    const record = value;
    if (record.contract_version !== 'kersor-mission-v1') {
        throw new Error(`kersor: only kersor-mission-v1 is launchable: ${mission}`);
    }
    const base = path.dirname(mission);
    const workspace = contractPath(record.workspace, 'workspace', base, mission);
    const session = contractPath(record.session, 'session', base, mission);
    const runtime = record.runtime ?? 'codex';
    if (runtime !== 'codex' && runtime !== 'pi' && runtime !== 'kernelowl') {
        throw new Error(`kersor: unsupported Mission runtime in ${mission}`);
    }
    return { workspace, session, runtime };
}
function contractPath(value, field, base, mission) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`kersor: Mission ${field} must be a non-empty string: ${mission}`);
    }
    return path.resolve(base, value);
}
function createRunId(taskId) {
    const timestamp = new Date().toISOString().replaceAll(/[-:.]/g, '');
    const slug = String(taskId).replaceAll(/[^A-Za-z0-9._-]/g, '-').slice(0, 48) || 'mission';
    return `${timestamp}-${slug}-${randomUUID().slice(0, 8)}`;
}
/** Cordis class-plugin entry. */
export default KersorService;
//# sourceMappingURL=service.js.map