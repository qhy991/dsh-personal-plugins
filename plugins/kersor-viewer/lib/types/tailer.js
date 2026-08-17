/**
 * Position-tracking tail of one KerSor `events.jsonl`. The writer appends one
 * JSON record per flushed line, so a byte-offset reader with truncation
 * detection is a complete live stream; `fs.watch` wakes the reader and a slow
 * poll backs it up on platforms where watch events lag (macOS FSEvents).
 * @module @deepseek-ai/dsh-kersor-viewer
 */
import { watch } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { errorCode, issueFromError, mergeIssue } from "./diagnostics.js";
/** Live reader over one events.jsonl file. */
export class EventsTailer {
    file;
    pollMs;
    onLines;
    onEnd;
    onObservation;
    offset = 0;
    watcher;
    timer;
    reading = false;
    stopped = false;
    watchDegraded = false;
    observationState = {
        state: 'waiting', byteOffset: 0, linesRead: 0,
    };
    /**
     * @param file - absolute path to `events.jsonl`.
     * @param onLines - complete new lines (no trailing newline), in file order.
     * @param onEnd - optional callback when stop() completes.
     * @param options - polling interval and optional observation sink.
     */
    constructor(file, onLines, onEnd, options = {}) {
        this.file = file;
        this.onLines = onLines;
        this.onEnd = onEnd;
        this.pollMs = options.pollMs ?? 300;
        this.onObservation = options.onObservation;
    }
    /** Begin watching; the first drain reads any lines already present. */
    start() {
        if (this.stopped)
            return;
        try {
            this.watcher = watch(path.dirname(this.file), { persistent: false }, (_event, filename) => {
                if (filename === null || filename === path.basename(this.file))
                    void this.drain();
            });
            this.watcher.on('error', (error) => { this.recordWatchIssue(error); });
        }
        catch (error) {
            this.recordWatchIssue(error);
        }
        this.timer = setInterval(() => { void this.drain(); }, this.pollMs);
        this.timer.unref();
        void this.drain();
    }
    /** Stop watching and invoke `onEnd`. Safe to call twice. */
    stop() {
        if (this.stopped)
            return;
        this.stopped = true;
        this.watcher?.close();
        if (this.timer !== undefined)
            clearInterval(this.timer);
        this.onEnd?.();
    }
    /** Current byte offset (diagnostics and tests). */
    get byteOffset() {
        return this.offset;
    }
    /** Complete current tail-source observation. */
    get observation() {
        return this.observationState;
    }
    /** Read newly appended complete lines; detect truncation and reset. */
    async drain() {
        if (this.reading || this.stopped)
            return;
        this.reading = true;
        try {
            let handle;
            try {
                handle = await open(this.file, 'r');
            }
            catch (error) {
                if (errorCode(error) === 'ENOENT') {
                    this.replaceObservation({ state: this.watchDegraded ? 'degraded' : 'waiting' });
                }
                else {
                    this.recordReadIssue(error);
                }
                return;
            }
            try {
                const { size } = await handle.stat();
                if (size < this.offset)
                    this.offset = 0; // truncated/rotated: reread
                if (size === this.offset) {
                    this.recordReadSuccess(0);
                    return;
                }
                const length = size - this.offset;
                const buffer = Buffer.alloc(length);
                const { bytesRead } = await handle.read(buffer, 0, length, this.offset);
                const chunk = buffer.subarray(0, bytesRead).toString('utf8');
                // Advance only past the last complete line; a partial trailing line is
                // rewound so the next drain rereads it once its newline arrives.
                const lastNewline = chunk.lastIndexOf('\n');
                if (lastNewline === -1) {
                    this.recordReadSuccess(0);
                    return;
                }
                const nextOffset = this.offset + lastNewline + 1;
                const lines = chunk.slice(0, lastNewline).split('\n').filter(line => line.length > 0);
                if (lines.length > 0)
                    this.onLines(lines);
                this.offset = nextOffset;
                this.recordReadSuccess(lines.length);
            }
            finally {
                await handle.close();
            }
        }
        catch (error) {
            this.recordReadIssue(error);
        }
        finally {
            this.reading = false;
        }
    }
    recordWatchIssue(error) {
        this.watchDegraded = true;
        const issue = issueFromError('tailer_watch', error, 'warning');
        this.observationState = {
            ...this.observationState,
            state: 'degraded',
            lastIssue: mergeIssue(this.observationState.lastIssue, issue),
        };
        this.publishObservation();
    }
    recordReadIssue(error) {
        const issue = issueFromError('tailer_read', error);
        this.observationState = {
            ...this.observationState,
            state: 'failed',
            lastIssue: mergeIssue(this.observationState.lastIssue, issue),
        };
        this.publishObservation();
    }
    recordReadSuccess(lines) {
        this.observationState = {
            ...this.observationState,
            state: this.watchDegraded ? 'degraded' : 'healthy',
            byteOffset: this.offset,
            linesRead: this.observationState.linesRead + lines,
            lastReadAt: new Date().toISOString(),
        };
        this.publishObservation();
    }
    replaceObservation(replacement) {
        this.observationState = { ...this.observationState, ...replacement, byteOffset: this.offset };
        this.publishObservation();
    }
    publishObservation() {
        this.onObservation?.(this.observationState);
    }
}
//# sourceMappingURL=tailer.js.map