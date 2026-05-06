import { describe, expect, it } from 'vitest'
import { createPostUpdateDiff, createPostUpdateDiffHtml, hasPostUpdate } from '@/lib/post-update'

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

  it('renders inline diff markers for inserted, deleted, and updated html blocks', () => {
    const html = createPostUpdateDiffHtml(
      '<p>第一段</p><p>旧段落</p><p>被删除</p><p>最后一段</p>',
      '<p>第一段</p><p>新段落</p><p>最后一段</p><p>新增段落</p>',
    )

    expect(html).toContain('<p>第一段</p>')
    expect(html).toContain('data-diff-marker="D"')
    expect(html).toContain('<p>旧段落</p>')
    expect(html).toContain('data-diff-marker="U"')
    expect(html).toContain('<p>新段落</p>')
    expect(html).toContain('data-diff-marker="-"')
    expect(html).toContain('<p>被删除</p>')
    expect(html).toContain('data-diff-marker="+"')
    expect(html).toContain('<p>新增段落</p>')
  })

  it('keeps unchanged code blocks aligned by text content', () => {
    const code = '<pre><code>const a = 1</code></pre>'
    const html = createPostUpdateDiffHtml(
      `<p>前言</p>${code}`,
      `<p>更新前言</p>${code}`,
    )

    expect(html).toContain(code)
    expect(html.match(/data-diff-marker=/g)?.length).toBe(2)
  })
})
