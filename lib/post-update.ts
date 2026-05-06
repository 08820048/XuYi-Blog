import type { PostWithTags } from '@/lib/repositories/types'

type UpdateFields = Pick<PostWithTags, 'published_at' | 'content_updated_at'>

export type PostUpdateDiff = {
  added: string[]
  removed: string[]
}

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
