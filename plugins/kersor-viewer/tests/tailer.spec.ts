// The tailer: whole-line appends, partial trailing lines held back until the
// newline arrives, and truncation resetting the offset.

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EventsTailer } from '../src/tailer.ts'

const dirs: string[] = []

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'kersor-tailer-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

/** Let start()'s in-flight drain and one poll tick complete. */
async function settle(): Promise<void> {
  await new Promise((resolve) => { setTimeout(resolve, 60) })
}

describe('whole-line appends', () => {
  it('reads existing lines on first drain, then new appends', async () => {
    const dir = await tempDir()
    const file = path.join(dir, 'events.jsonl')
    await writeFile(file, '{"type":"a"}\n{"type":"b"}\n')
    const batches: string[][] = []
    const tailer = new EventsTailer(file, (lines) => { batches.push(lines) }, undefined, { pollMs: 10 })
    tailer.start()
    await settle()
    await writeFile(file, '{"type":"c"}\n', { flag: 'a' })
    await settle()
    tailer.stop()
    expect(batches).toEqual([['{"type":"a"}', '{"type":"b"}'], ['{"type":"c"}']])
  })
})

describe('partial trailing line', () => {
  it('holds back an unterminated line until the newline arrives', async () => {
    const dir = await tempDir()
    const file = path.join(dir, 'events.jsonl')
    await writeFile(file, '{"type":"a"}\n{"type":"part')
    const batches: string[][] = []
    const tailer = new EventsTailer(file, (lines) => { batches.push(lines) }, undefined, { pollMs: 10 })
    tailer.start()
    await settle()
    expect(batches).toEqual([['{"type":"a"}']])
    await writeFile(file, 'ial"}\n', { flag: 'a' })
    await settle()
    tailer.stop()
    expect(batches[1]).toEqual(['{"type":"partial"}'])
  })
})

describe('truncation', () => {
  it('resets the offset and rereads when the file shrinks', async () => {
    const dir = await tempDir()
    const file = path.join(dir, 'events.jsonl')
    await writeFile(file, '{"type":"long-line-1"}\n{"type":"long-line-2"}\n')
    const batches: string[][] = []
    const tailer = new EventsTailer(file, (lines) => { batches.push(lines) }, undefined, { pollMs: 10 })
    tailer.start()
    await settle()
    expect(batches).toHaveLength(1)
    // Rotate: replace with a shorter file.
    await writeFile(file, '{"type":"s"}\n')
    await settle()
    tailer.stop()
    expect(batches.at(-1)).toEqual(['{"type":"s"}'])
  })
})

describe('missing file', () => {
  it('stays quiet until the writer creates the file', async () => {
    const dir = await tempDir()
    const file = path.join(dir, 'events.jsonl')
    const batches: string[][] = []
    const tailer = new EventsTailer(file, (lines) => { batches.push(lines) }, undefined, { pollMs: 10 })
    tailer.start()
    await settle()
    expect(batches).toEqual([])
    await writeFile(file, '{"type":"first"}\n')
    await settle()
    tailer.stop()
    expect(batches).toEqual([['{"type":"first"}']])
  })
})

describe('stop', () => {
  it('invokes onEnd exactly once', async () => {
    const dir = await tempDir()
    const file = path.join(dir, 'events.jsonl')
    await writeFile(file, '{"type":"a"}\n')
    let ends = 0
    const tailer = new EventsTailer(file, () => {}, () => { ends += 1 }, { pollMs: 10 })
    tailer.start()
    await tailer.drain()
    tailer.stop()
    tailer.stop()
    expect(ends).toBe(1)
  })
})
