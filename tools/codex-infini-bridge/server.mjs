#!/usr/bin/env node
/**
 * Minimal local Responses-API → Chat-Completions bridge for codex CLI 0.146
 * against Infini-AI MaaS (chat/completions-only).
 *
 * Listens on 127.0.0.1:8143. Translates:
 *   POST /v1/responses  →  POST {UPSTREAM_BASE}/chat/completions (stream)
 * Non-streaming fallback included. Tool calls are translated 1:1
 * (Responses function tools ↔ Chat Completions tool_calls).
 *
 * Env: UPSTREAM_BASE (required HTTPS URL), PORT (default 8143). Auth header is
 * passed through unchanged.
 */
import http from 'node:http'

function requiredUpstreamBase(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('UPSTREAM_BASE is required')
  }
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('UPSTREAM_BASE must be a valid HTTPS URL')
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('UPSTREAM_BASE must be an HTTPS URL without credentials, query, or fragment')
  }
  return parsed.href.replace(/\/$/, '')
}

const UPSTREAM_BASE = requiredUpstreamBase(process.env.UPSTREAM_BASE)
const PORT = Number(process.env.PORT ?? 8143)
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be an integer from 1 through 65535')
}

/** Extract text content from a Responses-API content array. */
function responsesText(content) {
  if (!Array.isArray(content)) return ''
  return content.filter(c => c.type === 'output_text' || c.type === 'input_text' || c.type === 'summary_text')
    .map(c => c.text ?? '').join('')
}

/** Map one Responses-API input item into a Chat-Completions message. */
function toChatMessage(msg) {
  const kind = msg.type ?? msg.role
  switch (kind) {
    case 'system':
    case 'instructions':
      return { role: 'system', content: typeof msg.content === 'string' ? msg.content : responsesText(msg.content) }
    case 'user':
      return { role: 'user', content: typeof msg.content === 'string' ? msg.content : responsesText(msg.content) }
    case 'assistant': {
      if (Array.isArray(msg.content)) {
        const text = responsesText(msg.content)
        const calls = msg.content.filter(c => c.type === 'function_call')
          .map(c => ({ id: c.call_id, type: 'function', function: { name: c.name, arguments: c.arguments ?? '{}' } }))
        return calls.length > 0 ? { role: 'assistant', content: text || null, tool_calls: calls } : { role: 'assistant', content: text }
      }
      return { role: 'assistant', content: typeof msg.content === 'string' ? msg.content : '' }
    }
    case 'function_call': // top-level function_call item
      return { role: 'assistant', content: null, tool_calls: [{ id: msg.call_id, type: 'function', function: { name: msg.name, arguments: msg.arguments ?? '{}' } }] }
    case 'local_shell_call':
      return { role: 'assistant', content: null, tool_calls: [{ id: msg.call_id ?? msg.id, type: 'function', function: { name: 'local_shell', arguments: JSON.stringify(msg.action ?? {}) } }] }
    case 'function_call_output':
    case 'local_shell_call_output': {
      // `output` is a string in some codex versions, an {output, metadata}
      // object in others.
      let out = msg.output
      if (out && typeof out === 'object') out = out.output ?? JSON.stringify(out)
      if (typeof out !== 'string') out = JSON.stringify(out ?? '')
      return { role: 'tool', tool_call_id: msg.call_id, content: out }
    }
    default:
      return { role: 'user', content: typeof msg.content === 'string' ? msg.content : responsesText(msg.content) || JSON.stringify(msg.content ?? '') }
  }
}

/** Extract the first complete JSON value from model text (fence-tolerant). */
function extractJson(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidates = []
  if (fence?.[1]) candidates.push(fence[1].trim())
  candidates.push(text.trim())
  for (const candidate of candidates) {
    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      try { return JSON.stringify(JSON.parse(candidate)) } catch { /* try next */ }
    }
  }
  // Last resort: first balanced {...} or [...] span.
  for (const pair of [['{', '}'], ['[', ']']]) {
    const [open, close] = pair
    const start = text.indexOf(open)
    if (start === -1) continue
    let depth = 0
    let inString = false
    let escaped = false
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i]
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === '"') inString = !inString
      if (inString) continue
      if (ch === open) depth += 1
      else if (ch === close) {
        depth -= 1
        if (depth === 0) {
          try { return JSON.stringify(JSON.parse(text.slice(start, i + 1))) } catch { break }
        }
      }
    }
  }
  return undefined
}

/** Convert one Responses request body into a Chat Completions request body. */
function toChatRequest(body) {
  const messages = (body.input ?? []).map(toChatMessage)
  // Prepend instructions as system prompt when present.
  if (typeof body.instructions === 'string' && body.instructions.length > 0) {
    messages.unshift({ role: 'system', content: body.instructions })
  }
  const tools = (body.tools ?? []).filter(t => t.type === 'function').map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description ?? '', parameters: t.parameters ?? { type: 'object', properties: {} } },
  }))
  const req = {
    model: body.model,
    messages,
    stream: body.stream === true,
  }
  // Responses text.format (codex --output-schema) → prompt-level JSON
  // constraint. Infini's chat/completions breaks tool calling when
  // response_format is set (no tool_calls, empty content), so the schema is
  // injected into the system prompt instead of the wire field.
  if (body.text?.format?.type === 'json_schema' && body.text.format.schema) {
    const schema = body.text.format.schema
    messages.push({
      role: 'system',
      content: 'CRITICAL OUTPUT CONTRACT: Your final message must be EXACTLY one JSON value (no prose, no markdown fences) validating against this JSON Schema: '
        + JSON.stringify(schema)
        + ' Use the available tools first to gather any facts you need; only then emit the final JSON.',
    })
  } else if (body.text?.format?.type === 'json_object') {
    messages.push({
      role: 'system',
      content: 'CRITICAL OUTPUT CONTRACT: Your final message must be EXACTLY one JSON object (no prose, no markdown fences).',
    })
  }
  if (tools.length > 0) req.tools = tools
  if (typeof body.max_output_tokens === 'number') req.max_tokens = body.max_output_tokens
  if (body.temperature !== undefined) req.temperature = body.temperature
  if (body.tool_choice !== undefined && body.tool_choice !== 'auto') req.tool_choice = body.tool_choice
  if (body.reasoning?.effort && ['low', 'medium', 'high'].includes(body.reasoning.effort)) req.reasoning_effort = body.reasoning.effort
  req.jsonContract = body.text?.format?.type === 'json_schema' || body.text?.format?.type === 'json_object'
  return req
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'codex-infini-bridge' }))
    return
  }
  if (req.method !== 'POST' || !req.url.endsWith('/responses')) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'not_bridged', message: 'request route is not supported' } }))
    return
  }
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => {
    let body
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'invalid JSON body' } }))
      return
    }
    const chatReq = toChatRequest(body)
    // Internal flag must not leak into the upstream request body.
    const { jsonContract, ...upstreamReq } = chatReq
    const auth = req.headers.authorization
    fetch(`${UPSTREAM_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(auth !== undefined ? { authorization: auth } : {}),
        accept: chatReq.stream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(upstreamReq),
    }).then(upstream => {
      if (!chatReq.stream) {
        res.writeHead(upstream.status, { 'content-type': 'application/json' })
        upstream.body.pipeTo(new WritableStream({
          write(chunk) { res.write(chunk) },
          close() { res.end() },
        }))
        return
      }
      // Stream: translate SSE chat deltas into SSE Responses events for codex.
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
      const seq = { n: 0 }
      const send = obj => res.write(`data: ${JSON.stringify(obj)}\n\n`)
      send({ type: 'response.created', response: { id: 'bridge', model: body.model } })
      const reader = upstream.body.pipeThrough(new TextDecoderStream()).getReader()
      const toolCalls = [] // accumulate per-index tool call args
      let lastUsage = null
      let messageItemSent = false
      let fullText = ''
      const ensureMessageItem = () => {
        if (messageItemSent) return
        messageItemSent = true
        send({ type: 'response.output_item.added', output_index: 0, item: { type: 'message', role: 'assistant', id: 'msg_1', status: 'in_progress', content: [] } })
        send({ type: 'response.content_part.added', item_id: 'msg_1', output_index: 0, content_index: 0, part: { type: 'output_text', text: '', annotations: [] } })
      }
      const processLine = line => {
        if (!line.startsWith('data: ')) return
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        let evt
        try { evt = JSON.parse(data) } catch { return }
        const delta = evt.choices?.[0]?.delta
        if (delta?.content) {
          ensureMessageItem()
          fullText += delta.content
          send({ type: 'response.output_text.delta', item_id: 'msg_1', output_index: 0, content_index: 0, delta: delta.content })
        }
        if (delta?.reasoning_content) {
          send({ type: 'response.reasoning_text.delta', item_id: 'rs_1', output_index: 0, delta: delta.reasoning_content })
        }
        if (Array.isArray(delta?.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const i = tc.index ?? 0
            toolCalls[i] ??= { id: tc.id ?? `call_${i}`, name: '', args: '' }
            if (tc.function?.name) toolCalls[i].name += tc.function.name
            if (tc.function?.arguments) toolCalls[i].args += tc.function.arguments
          }
        }
        if (evt.usage) lastUsage = evt.usage
      }
      let sseBuffer = ''
      const pump = () => reader.read().then(({ done, value }) => {
        if (done) {
          if (sseBuffer.length > 0) processLine(sseBuffer)
          if (messageItemSent) {
            // When the request demanded a JSON output contract, reshape the
            // final text to exactly one JSON value: models often prepend
            // prose or wrap in markdown fences despite the instruction.
            let finalText = fullText
            if (chatReq.jsonContract && toolCalls.length === 0) {
              const extracted = extractJson(fullText)
              if (extracted !== undefined) finalText = extracted
            }
            send({ type: 'response.output_text.done', item_id: 'msg_1', output_index: 0, content_index: 0, text: finalText })
            send({ type: 'response.content_part.done', item_id: 'msg_1', output_index: 0, content_index: 0, part: { type: 'output_text', text: finalText, annotations: [] } })
            send({ type: 'response.output_item.done', output_index: 0, item: { type: 'message', id: 'msg_1', status: 'completed', role: 'assistant', content: [{ type: 'output_text', text: finalText, annotations: [] }] } })
          }
          for (let i = 0; i < toolCalls.length; i += 1) {
            const tc = toolCalls[i]
            if (!tc) continue
            send({ type: 'response.output_item.added', output_index: 0, item: { type: 'function_call', id: tc.id, call_id: tc.id, name: tc.name, arguments: tc.args, status: 'completed' } })
            send({ type: 'response.output_item.done', output_index: 0, item: { type: 'function_call', id: tc.id, call_id: tc.id, name: tc.name, arguments: tc.args, status: 'completed' } })
          }
          // codex's ResponseCompleted parser requires usage.input_tokens.
          const usage = lastUsage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          send({ type: 'response.completed', response: { id: 'bridge', model: body.model, usage: { input_tokens: usage.prompt_tokens ?? 0, input_tokens_details: { cached_tokens: 0 }, output_tokens: usage.completion_tokens ?? 0, output_tokens_details: { reasoning_tokens: 0 }, total_tokens: usage.total_tokens ?? 0 } } })
          res.end()
          return
        }
        // Buffer across reader chunks: a TCP segment boundary can split one
        // SSE line mid-JSON; parsing half a line silently drops characters.
        sseBuffer += value
        let newline
        while ((newline = sseBuffer.indexOf('\n')) !== -1) {
          const line = sseBuffer.slice(0, newline)
          sseBuffer = sseBuffer.slice(newline + 1)
          processLine(line)
        }
        return pump()
      })
      pump().catch(() => {
        console.error('[bridge] stream failed')
        res.end()
      })
    }).catch(() => {
      console.error('[bridge] upstream request failed')
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'application/json' })
      }
      res.end(JSON.stringify({ error: { code: 'upstream_unavailable', message: 'bridge upstream request failed' } }))
    })
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[bridge] codex responses→chat bridge listening on http://127.0.0.1:${PORT}`)
})

let shuttingDown = false
function shutDown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[bridge] received ${signal}; shutting down`)
  const deadline = setTimeout(() => {
    console.error('[bridge] graceful shutdown timed out')
    process.exit(1)
  }, 5000)
  deadline.unref()
  server.close(error => {
    clearTimeout(deadline)
    if (error) console.error('[bridge] graceful shutdown failed')
    process.exitCode = error ? 1 : 0
  })
}

process.once('SIGTERM', () => shutDown('SIGTERM'))
process.once('SIGINT', () => shutDown('SIGINT'))
