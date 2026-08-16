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
/** Live reader over one events.jsonl file. */
export class EventsTailer {
    file;
    pollMs;
    onLines;
    onEnd;
    offset = 0;
    watcher;
    timer;
    reading = false;
    stopped = false;
    /**
     * @param file - absolute path to `events.jsonl`.
     * @param onLines - complete new lines (no trailing newline), in file order.
     * @param onEnd - optional callback when stop() completes.
     */
    constructor(file, onLines, onEnd, options = {}) {
        this.file = file;
        this.onLines = onLines;
        this.onEnd = onEnd;
        this.pollMs = options.pollMs ?? 300;
    }
    /** Begin watching; the first drain reads any lines already present. */
    start() {
        if (this.stopped)
            return;
        this.watcher = watch(path.dirname(this.file), { persistent: false }, (_event, filename) => {
            // null = directory-wide event on platforms that name no file; drain is
            // idempotent so treating those as this file's is safe.
            if (filename === null || filename === path.basename(this.file))
                void this.drain();
        });
        this.watcher.on('error', () => { });
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
            catch {
                return; // not created yet; the writer creates it lazily
            }
            try {
                const { size } = await handle.stat();
                if (size < this.offset)
                    this.offset = 0; // truncated/rotated: reread
                if (size === this.offset)
                    return;
                const length = size - this.offset;
                const buffer = Buffer.alloc(length);
                const { bytesRead } = await handle.read(buffer, 0, length, this.offset);
                const chunk = buffer.subarray(0, bytesRead).toString('utf8');
                // Advance only past the last complete line; a partial trailing line is
                // rewound so the next drain rereads it once its newline arrives.
                const lastNewline = chunk.lastIndexOf('\n');
                if (lastNewline === -1)
                    return;
                this.offset += lastNewline + 1;
                const lines = chunk.slice(0, lastNewline).split('\n').filter(line => line.length > 0);
                if (lines.length > 0)
                    this.onLines(lines);
            }
            finally {
                await handle.close();
            }
        }
        catch {
            // Transient read races with the writer are retried by the next poll.
        }
        finally {
            this.reading = false;
        }
    }
}
//# sourceMappingURL=tailer.js.map