import { describe, expect, it } from 'vitest'
import { createPostUpdateDiff, hasPostUpdate } from '@/lib/post-update'

describe('post update helpers', () => {
  it('marks posts as updated only after publish time', () => {
    expect(hasPostUpdate({ published_at: 100, content_updated_at: 101 })).toBe(true)
    expect(hasPostUpdate({ published_at: 100, content_updated_at: 100 })).toBe(false)
    expect(hasPostUpdate({ published_at: 100, content_updated_at: null })).toBe(false)
  })

  it('extracts added and removed paragraph snippets', () => {
    const diff = createPostUpdateDiff(
      '第一段\n\n旧段落',
      '第一段\n\n新段落\n\n另一个新增段落',
    )

    expect(diff.added).toEqual(['新段落', '另一个新增段落'])
    expect(diff.removed).toEqual(['旧段落'])
  })

  it('normalizes whitespace before comparing blocks', () => {
    const diff = createPostUpdateDiff('第一段  内容', '第一段 内容')

    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
  })
})
