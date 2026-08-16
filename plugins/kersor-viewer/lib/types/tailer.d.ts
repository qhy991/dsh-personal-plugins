/**
 * Position-tracking tail of one KerSor `events.jsonl`. The writer appends one
 * JSON record per flushed line, so a byte-offset reader with truncation
 * detection is a complete live stream; `fs.watch` wakes the reader and a slow
 * poll backs it up on platforms where watch events lag (macOS FSEvents).
 * @module @deepseek-ai/dsh-kersor-viewer
 */
export interface EventsTailerOptions {
    /** Poll fallback interval; also bounds watch-event latency. */
    readonly pollMs?: number;
}
/** Live reader over one events.jsonl file. */
export declare class EventsTailer {
    private readonly file;
    private readonly pollMs;
    private readonly onLines;
    private readonly onEnd;
    private offset;
    private watcher;
    private timer;
    private reading;
    private stopped;
    /**
     * @param file - absolute path to `events.jsonl`.
     * @param onLines - complete new lines (no trailing newline), in file order.
     * @param onEnd - optional callback when stop() completes.
     */
    constructor(file: string, onLines: (lines: string[]) => void, onEnd?: () => void, options?: EventsTailerOptions);
    /** Begin watching; the first drain reads any lines already present. */
    start(): void;
    /** Stop watching and invoke `onEnd`. Safe to call twice. */
    stop(): void;
    /** Current byte offset (diagnostics and tests). */
    get byteOffset(): number;
    /** Read newly appended complete lines; detect truncation and reset. */
    drain(): Promise<void>;
}
//# sourceMappingURL=tailer.d.ts.map