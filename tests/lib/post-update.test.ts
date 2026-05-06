import { describe, expect, it } from 'vitest'
import { createPostUpdateDiff, createPostUpdateLineDiff, hasPostUpdate } from '@/lib/post-update'

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

  it('creates GitHub-style hunks with line numbers and context', () => {
    const hunks = createPostUpdateLineDiff(
      '第一段\n旧段落\n被删除\n最后一段',
      '第一段\n新段落\n最后一段\n新增段落',
      1,
    )

    expect(hunks).toHaveLength(1)
    expect(hunks[0].rows.map((row) => row.type)).toEqual([
      'context',
      'removed',
      'removed',
      'added',
      'context',
      'added',
    ])
    expect(hunks[0].rows[1]).toMatchObject({ oldLine: 2, newLine: null, text: '旧段落' })
    expect(hunks[0].rows[3]).toMatchObject({ oldLine: null, newLine: 2, text: '新段落' })
  })

  it('adds word-level inline highlights for replacement lines', () => {
    const hunks = createPostUpdateLineDiff(
      '使用 OpenAI 生成短摘要',
      '使用 OpenAI 生成文章摘要',
    )
    const removed = hunks[0].rows.find((row) => row.type === 'removed')
    const added = hunks[0].rows.find((row) => row.type === 'added')

    expect(removed?.inline?.some((part) => part.type === 'removed' && part.text.includes('短'))).toBe(true)
    expect(added?.inline?.some((part) => part.type === 'added' && part.text.includes('文章'))).toBe(true)
  })
})
