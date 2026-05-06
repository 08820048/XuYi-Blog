import type { PostWithTags } from '@/lib/repositories/types'

type UpdateFields = Pick<PostWithTags, 'published_at' | 'content_updated_at'>

export type PostUpdateDiff = {
  added: string[]
  removed: string[]
}

export type InlineDiffPart = {
  type: 'same' | 'added' | 'removed'
  text: string
}

export type PostUpdateDiffRow = {
  type: 'context' | 'added' | 'removed'
  oldLine: number | null
  newLine: number | null
  text: string
  inline?: InlineDiffPart[]
}

export type PostUpdateDiffHunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  rows: PostUpdateDiffRow[]
}

type LineOp =
  | { type: 'equal'; oldLine: number; newLine: number; text: string }
  | { type: 'delete'; oldLine: number; text: string }
  | { type: 'insert'; newLine: number; text: string }

const DEFAULT_CONTEXT_LINES = 3

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

function splitLines(text: string | null | undefined) {
  return (text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
}

function normalizeLineForDiff(line: string) {
  return line.replace(/\s+/g, ' ').trim()
}

function buildLcsTable<T>(left: T[], right: T[], isEqual: (left: T, right: T) => boolean) {
  const table = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0) as number[])

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] = isEqual(left[i], right[j])
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  return table
}

function createLineOps(previousLines: string[], currentLines: string[]) {
  const normalizedPrevious = previousLines.map(normalizeLineForDiff)
  const normalizedCurrent = currentLines.map(normalizeLineForDiff)
  const table = buildLcsTable(normalizedPrevious, normalizedCurrent, (left, right) => left === right)
  const ops: LineOp[] = []
  let i = 0
  let j = 0

  while (i < previousLines.length || j < currentLines.length) {
    if (i < previousLines.length && j < currentLines.length && normalizedPrevious[i] === normalizedCurrent[j]) {
      ops.push({ type: 'equal', oldLine: i + 1, newLine: j + 1, text: currentLines[j] })
      i += 1
      j += 1
      continue
    }

    if (j >= currentLines.length || (i < previousLines.length && table[i + 1][j] >= table[i][j + 1])) {
      ops.push({ type: 'delete', oldLine: i + 1, text: previousLines[i] })
      i += 1
    } else {
      ops.push({ type: 'insert', newLine: j + 1, text: currentLines[j] })
      j += 1
    }
  }

  return ops
}

function tokenizeInline(text: string) {
  return text.match(/(\s+|[\u4e00-\u9fff]|[A-Za-z0-9_]+|[^\sA-Za-z0-9_\u4e00-\u9fff]+)/g) ?? []
}

function createInlineDiffParts(
  previousText: string,
  currentText: string,
): { removed: InlineDiffPart[]; added: InlineDiffPart[] } {
  const previous = tokenizeInline(previousText)
  const current = tokenizeInline(currentText)
  const table = buildLcsTable(previous, current, (left, right) => left === right)
  const removed: InlineDiffPart[] = []
  const added: InlineDiffPart[] = []
  let i = 0
  let j = 0

  const pushPart = (target: InlineDiffPart[], type: InlineDiffPart['type'], text: string) => {
    const last = target[target.length - 1]
    if (last?.type === type) {
      last.text += text
    } else {
      target.push({ type, text })
    }
  }

  while (i < previous.length || j < current.length) {
    if (i < previous.length && j < current.length && previous[i] === current[j]) {
      pushPart(removed, 'same', previous[i])
      pushPart(added, 'same', current[j])
      i += 1
      j += 1
      continue
    }

    if (j >= current.length || (i < previous.length && table[i + 1][j] >= table[i][j + 1])) {
      pushPart(removed, 'removed', previous[i])
      i += 1
    } else {
      pushPart(added, 'added', current[j])
      j += 1
    }
  }

  return { removed, added }
}

function pairChangedRows(rows: PostUpdateDiffRow[]) {
  let index = 0

  while (index < rows.length) {
    if (rows[index].type !== 'removed') {
      index += 1
      continue
    }

    const removedStart = index
    while (index < rows.length && rows[index].type === 'removed') index += 1
    const addedStart = index
    while (index < rows.length && rows[index].type === 'added') index += 1

    const removedRows = rows.slice(removedStart, addedStart)
    const addedRows = rows.slice(addedStart, index)
    const paired = Math.min(removedRows.length, addedRows.length)

    for (let pairIndex = 0; pairIndex < paired; pairIndex += 1) {
      const inline = createInlineDiffParts(removedRows[pairIndex].text, addedRows[pairIndex].text)
      removedRows[pairIndex].inline = inline.removed
      addedRows[pairIndex].inline = inline.added
    }
  }
}

function opsToRows(ops: LineOp[]) {
  return ops.map((op): PostUpdateDiffRow => {
    if (op.type === 'equal') {
      return { type: 'context', oldLine: op.oldLine, newLine: op.newLine, text: op.text }
    }
    if (op.type === 'delete') {
      return { type: 'removed', oldLine: op.oldLine, newLine: null, text: op.text }
    }
    return { type: 'added', oldLine: null, newLine: op.newLine, text: op.text }
  })
}

function createHunk(rows: PostUpdateDiffRow[]) {
  const oldLines = rows.filter((row) => row.type !== 'added')
  const newLines = rows.filter((row) => row.type !== 'removed')
  const oldStart = oldLines[0]?.oldLine ?? 0
  const newStart = newLines[0]?.newLine ?? 0

  return {
    oldStart,
    oldLines: oldLines.length,
    newStart,
    newLines: newLines.length,
    rows,
  } satisfies PostUpdateDiffHunk
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

export function createPostUpdateLineDiff(
  previousContent: string | null | undefined,
  currentContent: string | null | undefined,
  contextLines = DEFAULT_CONTEXT_LINES,
) {
  const previousLines = splitLines(previousContent)
  const currentLines = splitLines(currentContent)
  const rows = opsToRows(createLineOps(previousLines, currentLines))
  pairChangedRows(rows)

  const changedIndexes = rows
    .map((row, index) => (row.type === 'context' ? -1 : index))
    .filter((index) => index >= 0)

  if (changedIndexes.length === 0) return []

  const ranges: Array<{ start: number; end: number }> = []
  for (const index of changedIndexes) {
    const start = Math.max(0, index - contextLines)
    const end = Math.min(rows.length - 1, index + contextLines)
    const previous = ranges[ranges.length - 1]

    if (previous && start <= previous.end + 1) {
      previous.end = Math.max(previous.end, end)
    } else {
      ranges.push({ start, end })
    }
  }

  return ranges.map((range) => createHunk(rows.slice(range.start, range.end + 1)))
}
