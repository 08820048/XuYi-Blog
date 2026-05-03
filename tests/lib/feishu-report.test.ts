import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildFeishuPostPayload,
  buildFeishuReportText,
  createFeishuSign,
  sendFeishuWebhook,
  type BlogReport,
} from '@/lib/feishu-report'

function createReport(overrides: Partial<BlogReport> = {}): BlogReport {
  return {
    generatedAt: new Date('2026-05-03T00:00:00.000Z'),
    generatedAtText: '2026/05/03 08:00',
    momentLabel: '早报',
    stats: {
      allPosts: 12,
      publicPosts: 10,
      draftPosts: 1,
      hiddenPosts: 1,
      encryptedPosts: 0,
      deletedPosts: 2,
      totalViews: 3456,
      todayNewPosts: 2,
      todayUpdatedPosts: 3,
    },
    deltas: {
      publicPosts: 1,
      totalViews: 88,
    },
    topPosts: [
      {
        title: '热门文章',
        slug: 'hot-post',
        category: '随笔',
        published_at: 1710000000,
        view_count: 256,
      },
    ],
    latestPosts: [
      {
        title: '最新文章',
        slug: 'latest-post',
        category: '技术',
        published_at: 1710000100,
        view_count: 18,
      },
    ],
    categories: [{ category: '技术', count: 4 }],
    siteUrl: 'https://blog.example.com',
    ...overrides,
  }
}

describe('feishu report helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('formats a readable blog report with deltas and post links', () => {
    const text = buildFeishuReportText(createReport())

    expect(text).toContain('乔木博客数据报告｜早报')
    expect(text).toContain('公开文章：10 篇（较上次 +1）')
    expect(text).toContain('累计浏览：3456 次（较上次 +88）')
    expect(text).toContain('今日新增：2 篇；今日更新：3 篇')
    expect(text).toContain('1. 热门文章｜随笔｜256 次｜https://blog.example.com/hot-post')
  })

  it('builds a Feishu rich-text post payload', () => {
    const payload = buildFeishuPostPayload('报告标题', '第一行\n\n第三行')

    expect(payload).toEqual({
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: '报告标题',
            content: [
              [{ tag: 'text', text: '第一行' }],
              [{ tag: 'text', text: ' ' }],
              [{ tag: 'text', text: '第三行' }],
            ],
          },
        },
      },
    })
  })

  it('sends signed payloads when a Feishu bot secret is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, msg: 'ok' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const now = new Date('2026-05-03T00:00:00.000Z')
    const payload = buildFeishuPostPayload('报告标题', '正文')
    await sendFeishuWebhook('https://open.feishu.cn/webhook/test', payload, 'secret', now)

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    const timestamp = Math.floor(now.getTime() / 1000)

    expect(body.timestamp).toBe(timestamp)
    await expect(createFeishuSign('secret', timestamp)).resolves.toBe(body.sign)
    expect(body.msg_type).toBe('post')
  })

  it('throws when Feishu returns an application-level error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 19021, msg: 'sign invalid' }), { status: 200 }),
      ),
    )

    await expect(
      sendFeishuWebhook('https://open.feishu.cn/webhook/test', buildFeishuPostPayload('标题', '正文')),
    ).rejects.toThrow('sign invalid')
  })
})
