import type { PostWithTags } from '@/lib/repositories/types'

type UpdateFields = Pick<PostWithTags, 'published_at' | 'content_updated_at'>

type HtmlBlock = {
  html: string
  key: string
}

type DiffMarker = '+' | '-' | 'D' | 'U'

export type PostUpdateDiff = {
  added: string[]
  removed: string[]
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

function normalizeBlock(block: string) {
  return block.replace(/\s+/g, ' ').trim()
}

function splitBlocks(text: string | null | undefined) {
  return (text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(normalizeBlock)
    .filter(Boolean)
}

function compactSnippet(text: string, maxLength = 150) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
}

function htmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
}

function getBlockKey(html: string) {
  return normalizeBlock(htmlToText(html)) || normalizeBlock(html)
}

function splitTopLevelHtml(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = []
  const tagPattern = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*?)?>/g
  let depth = 0
  let blockStart = -1
  let lastClosed = 0
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(html)) !== null) {
    const token = match[0]
    const tagName = match[1]?.toLowerCase()

    if (!tagName) continue

    if (depth === 0 && match.index > lastClosed) {
      const text = html.slice(lastClosed, match.index)
      if (text.trim()) {
        const escaped = escapeHtml(text)
        blocks.push({ html: escaped, key: getBlockKey(escaped) })
      }
    }

    const isClosing = token.startsWith('</')
    const isSelfClosing = token.endsWith('/>') || VOID_TAGS.has(tagName)

    if (isClosing) {
      if (depth > 0) depth -= 1

      if (depth === 0 && blockStart >= 0) {
        const blockHtml = html.slice(blockStart, tagPattern.lastIndex)
        blocks.push({ html: blockHtml, key: getBlockKey(blockHtml) })
        blockStart = -1
        lastClosed = tagPattern.lastIndex
      }
      continue
    }

    if (depth === 0) blockStart = match.index

    if (!isSelfClosing) {
      depth += 1
      continue
    }

    if (depth === 0) {
      const blockHtml = html.slice(match.index, tagPattern.lastIndex)
      blocks.push({ html: blockHtml, key: getBlockKey(blockHtml) })
      blockStart = -1
      lastClosed = tagPattern.lastIndex
    }
  }

  if (depth === 0 && lastClosed < html.length) {
    const text = html.slice(lastClosed)
    if (text.trim()) {
      const escaped = escapeHtml(text)
      blocks.push({ html: escaped, key: getBlockKey(escaped) })
    }
  }

  if (blocks.length === 0 && html.trim()) {
    return [{ html, key: getBlockKey(html) }]
  }

  return blocks
}

function buildLcsTable(previous: HtmlBlock[], current: HtmlBlock[]) {
  const table = Array.from({ length: previous.length + 1 }, () => Array(current.length + 1).fill(0) as number[])

  for (let i = previous.length - 1; i >= 0; i -= 1) {
    for (let j = current.length - 1; j >= 0; j -= 1) {
      table[i][j] = previous[i].key === current[j].key
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  return table
}

function renderMarkedBlock(marker: DiffMarker, html: string) {
  const label = marker === '+'
    ? '新增'
    : marker === '-'
      ? '删除'
      : marker === 'D'
        ? '更新前'
        : '更新后'
  const variant = marker === '+'
    ? 'added'
    : marker === '-'
      ? 'removed'
      : marker === 'D'
        ? 'before'
        : 'after'

  return `<div class="post-update-diff-block post-update-diff-block--${variant}" data-diff-marker="${marker}"><span class="post-update-diff-sign" aria-label="${label}">${marker}</span><div class="post-update-diff-body">${html}</div></div>`
}

function renderChangeGroup(deleted: HtmlBlock[], inserted: HtmlBlock[]) {
  const html: string[] = []
  const paired = Math.min(deleted.length, inserted.length)

  for (let index = 0; index < paired; index += 1) {
    html.push(renderMarkedBlock('D', deleted[index].html))
    html.push(renderMarkedBlock('U', inserted[index].html))
  }

  deleted.slice(paired).forEach((block) => {
    html.push(renderMarkedBlock('-', block.html))
  })

  inserted.slice(paired).forEach((block) => {
    html.push(renderMarkedBlock('+', block.html))
  })

  return html.join('')
}

export function hasPostUpdate(post: UpdateFields) {
  return Boolean(post.content_updated_at && post.content_updated_at > post.published_at)
}

export function formatPostUpdateDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function createPostUpdateDiff(
  previousContent: string | null | undefined,
  currentContent: string | null | undefined,
  limit = 4,
): PostUpdateDiff {
  const previousBlocks = splitBlocks(previousContent)
  const currentBlocks = splitBlocks(currentContent)
  const previousSet = new Set(previousBlocks)
  const currentSet = new Set(currentBlocks)

  return {
    added: currentBlocks
      .filter((block) => !previousSet.has(block))
      .slice(0, limit)
      .map((block) => compactSnippet(block)),
    removed: previousBlocks
      .filter((block) => !currentSet.has(block))
      .slice(0, limit)
      .map((block) => compactSnippet(block)),
  }
}

export function createPostUpdateDiffHtml(
  previousHtml: string | null | undefined,
  currentHtml: string,
) {
  if (!previousHtml?.trim()) return currentHtml

  const previous = splitTopLevelHtml(previousHtml)
  const current = splitTopLevelHtml(currentHtml)
  const table = buildLcsTable(previous, current)
  const html: string[] = []
  let i = 0
  let j = 0

  while (i < previous.length || j < current.length) {
    if (i < previous.length && j < current.length && previous[i].key === current[j].key) {
      html.push(current[j].html)
      i += 1
      j += 1
      continue
    }

    const deleted: HtmlBlock[] = []
    const inserted: HtmlBlock[] = []

    while (i < previous.length || j < current.length) {
      if (i < previous.length && j < current.length && previous[i].key === current[j].key) break

      if (j >= current.length || (i < previous.length && table[i + 1][j] >= table[i][j + 1])) {
        deleted.push(previous[i])
        i += 1
      } else {
        inserted.push(current[j])
        j += 1
      }
    }

    html.push(renderChangeGroup(deleted, inserted))
  }

  return html.join('')
}
