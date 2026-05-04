import { ensureSchema, type Database } from '@/lib/repositories/schema'
import { getSetting, setSetting } from '@/lib/repositories/settings'
import type { PostWithTags } from '@/lib/repositories/types'

export interface FeishuReportEnv extends Partial<CloudflareEnv> {
  DB: D1Database
}

export interface PushFeishuReportOptions {
  now?: Date
  dryRun?: boolean
}

export interface PushFeishuNewPostOptions {
  now?: Date
  dryRun?: boolean
}

type CountStatsRow = {
  all_posts: number | null
  public_posts: number | null
  draft_posts: number | null
  hidden_posts: number | null
  encrypted_posts: number | null
  deleted_posts: number | null
  total_views: number | null
  today_new_posts: number | null
  today_updated_posts: number | null
}

type ReportPostRow = {
  title: string
  slug: string
  category: string | null
  published_at: number
  view_count: number
}

type ReportCategoryRow = {
  category: string | null
  count: number
}

type NewPostStatsRow = {
  public_posts: number | null
  total_views: number | null
}

type ReportSnapshot = {
  generatedAt: number
  allPosts: number
  publicPosts: number
  totalViews: number
}

export interface BlogReport {
  generatedAt: Date
  generatedAtText: string
  siteName: string
  momentLabel: string
  stats: {
    allPosts: number
    publicPosts: number
    draftPosts: number
    hiddenPosts: number
    encryptedPosts: number
    deletedPosts: number
    totalViews: number
    todayNewPosts: number
    todayUpdatedPosts: number
  }
  deltas: {
    publicPosts: number | null
    totalViews: number | null
  }
  topPosts: ReportPostRow[]
  latestPosts: ReportPostRow[]
  categories: ReportCategoryRow[]
  siteUrl: string
}

const SNAPSHOT_KEY = 'feishu_report_snapshot'
const CHINA_TIME_OFFSET_SECONDS = 8 * 60 * 60
const DEFAULT_REPORT_SITE_NAME = 'XuYi博客'

function toNumber(value: number | null | undefined) {
  return typeof value === 'number' ? value : 0
}

function getChinaDayStartSeconds(now: Date) {
  const seconds = Math.floor(now.getTime() / 1000)
  return Math.floor((seconds + CHINA_TIME_OFFSET_SECONDS) / 86400) * 86400 - CHINA_TIME_OFFSET_SECONDS
}

function formatChinaTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function getChinaHour(date: Date) {
  return (date.getUTCHours() + 8) % 24
}

function getReportMomentLabel(date: Date) {
  const hour = getChinaHour(date)
  if (hour === 8) return '早报'
  if (hour === 12) return '午报'
  if (hour === 23) return '晚报'
  return '手动报告'
}

function normalizeSiteUrl(siteUrl: string | undefined) {
  return (siteUrl || '').trim().replace(/\/+$/, '')
}

function normalizeSiteName(siteName: string | undefined) {
  return siteName?.trim() || DEFAULT_REPORT_SITE_NAME
}

function getReportSiteName(env: Pick<FeishuReportEnv, 'NEXT_PUBLIC_SITE_NAME' | 'FEISHU_REPORT_SITE_NAME'>) {
  return normalizeSiteName(env.FEISHU_REPORT_SITE_NAME || env.NEXT_PUBLIC_SITE_NAME)
}

function buildPostUrl(siteUrl: string, slug: string) {
  return siteUrl ? `${siteUrl}/${slug}` : `/${slug}`
}

function isPublicPost(post: Pick<PostWithTags, 'status' | 'password' | 'is_hidden' | 'deleted_at'>) {
  return post.status === 'published' && !post.password && post.is_hidden === 0 && post.deleted_at == null
}

function parseSnapshot(value: string | null): ReportSnapshot | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<ReportSnapshot>
    if (
      typeof parsed.generatedAt === 'number' &&
      typeof parsed.allPosts === 'number' &&
      typeof parsed.publicPosts === 'number' &&
      typeof parsed.totalViews === 'number'
    ) {
      return parsed as ReportSnapshot
    }
  } catch {}
  return null
}

function createSnapshot(report: BlogReport): ReportSnapshot {
  return {
    generatedAt: Math.floor(report.generatedAt.getTime() / 1000),
    allPosts: report.stats.allPosts,
    publicPosts: report.stats.publicPosts,
    totalViews: report.stats.totalViews,
  }
}

export async function collectBlogReport(
  db: Database,
  env: Pick<FeishuReportEnv, 'NEXT_PUBLIC_SITE_URL' | 'NEXT_PUBLIC_SITE_NAME' | 'FEISHU_REPORT_SITE_NAME'> = {},
  now = new Date(),
): Promise<BlogReport> {
  await ensureSchema(db)

  const dayStartSeconds = getChinaDayStartSeconds(now)
  const publicWhere = "status = 'published' AND password IS NULL AND is_hidden = 0 AND deleted_at IS NULL"

  const statsRow = await db
    .prepare(
      `SELECT
        COUNT(*) AS all_posts,
        SUM(CASE WHEN ${publicWhere} THEN 1 ELSE 0 END) AS public_posts,
        SUM(CASE WHEN status = 'draft' AND deleted_at IS NULL THEN 1 ELSE 0 END) AS draft_posts,
        SUM(CASE WHEN is_hidden = 1 AND deleted_at IS NULL THEN 1 ELSE 0 END) AS hidden_posts,
        SUM(CASE WHEN password IS NOT NULL AND deleted_at IS NULL THEN 1 ELSE 0 END) AS encrypted_posts,
        SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS deleted_posts,
        COALESCE(SUM(CASE WHEN deleted_at IS NULL THEN view_count ELSE 0 END), 0) AS total_views,
        SUM(CASE WHEN ${publicWhere} AND published_at >= ? THEN 1 ELSE 0 END) AS today_new_posts,
        SUM(CASE WHEN deleted_at IS NULL AND updated_at >= ? AND published_at < ? THEN 1 ELSE 0 END) AS today_updated_posts
       FROM posts`,
    )
    .bind(dayStartSeconds, dayStartSeconds, dayStartSeconds)
    .first<CountStatsRow>()

  const { results: topPosts } = await db
    .prepare(
      `SELECT title, slug, category, published_at, view_count
       FROM posts
       WHERE ${publicWhere}
       ORDER BY view_count DESC, published_at DESC
       LIMIT 5`,
    )
    .all<ReportPostRow>()

  const { results: latestPosts } = await db
    .prepare(
      `SELECT title, slug, category, published_at, view_count
       FROM posts
       WHERE ${publicWhere}
       ORDER BY published_at DESC
       LIMIT 5`,
    )
    .all<ReportPostRow>()

  const { results: categories } = await db
    .prepare(
      `SELECT COALESCE(NULLIF(category, ''), '未分类') AS category, COUNT(*) AS count
       FROM posts
       WHERE ${publicWhere}
       GROUP BY COALESCE(NULLIF(category, ''), '未分类')
       ORDER BY count DESC, category ASC
       LIMIT 6`,
    )
    .all<ReportCategoryRow>()

  const previousSnapshot = parseSnapshot(await getSetting(db, SNAPSHOT_KEY))
  const publicPosts = toNumber(statsRow?.public_posts)
  const totalViews = toNumber(statsRow?.total_views)

  return {
    generatedAt: now,
    generatedAtText: formatChinaTime(now),
    siteName: getReportSiteName(env),
    momentLabel: getReportMomentLabel(now),
    stats: {
      allPosts: toNumber(statsRow?.all_posts),
      publicPosts,
      draftPosts: toNumber(statsRow?.draft_posts),
      hiddenPosts: toNumber(statsRow?.hidden_posts),
      encryptedPosts: toNumber(statsRow?.encrypted_posts),
      deletedPosts: toNumber(statsRow?.deleted_posts),
      totalViews,
      todayNewPosts: toNumber(statsRow?.today_new_posts),
      todayUpdatedPosts: toNumber(statsRow?.today_updated_posts),
    },
    deltas: {
      publicPosts: previousSnapshot ? publicPosts - previousSnapshot.publicPosts : null,
      totalViews: previousSnapshot ? totalViews - previousSnapshot.totalViews : null,
    },
    topPosts,
    latestPosts,
    categories,
    siteUrl: normalizeSiteUrl(env.NEXT_PUBLIC_SITE_URL),
  }
}

function formatDelta(value: number | null) {
  if (value === null) return '首次记录'
  if (value > 0) return `+${value}`
  return `${value}`
}

function formatPostLine(post: ReportPostRow, index: number, siteUrl: string) {
  const category = post.category ? `｜${post.category}` : ''
  return `${index + 1}. ${post.title}${category}｜${post.view_count} 次｜${buildPostUrl(siteUrl, post.slug)}`
}

function formatCategoryLine(category: ReportCategoryRow, index: number) {
  return `${index + 1}. ${category.category || '未分类'}：${category.count} 篇`
}

export function buildFeishuReportText(report: BlogReport) {
  const lines = [
    `${report.siteName}数据报告｜${report.momentLabel}`,
    `时间：${report.generatedAtText}（北京时间）`,
    '',
    `公开文章：${report.stats.publicPosts} 篇（较上次 ${formatDelta(report.deltas.publicPosts)}）`,
    `全部文章：${report.stats.allPosts} 篇；草稿：${report.stats.draftPosts}；隐藏：${report.stats.hiddenPosts}；加密：${report.stats.encryptedPosts}；已删除：${report.stats.deletedPosts}`,
    `累计浏览：${report.stats.totalViews} 次（较上次 ${formatDelta(report.deltas.totalViews)}）`,
    `今日新增：${report.stats.todayNewPosts} 篇；今日更新：${report.stats.todayUpdatedPosts} 篇`,
    '',
    '热门文章 Top 5',
    ...(report.topPosts.length > 0
      ? report.topPosts.map((post, index) => formatPostLine(post, index, report.siteUrl))
      : ['暂无公开文章']),
    '',
    '最新文章',
    ...(report.latestPosts.length > 0
      ? report.latestPosts.map((post, index) => formatPostLine(post, index, report.siteUrl))
      : ['暂无公开文章']),
    '',
    '分类分布',
    ...(report.categories.length > 0
      ? report.categories.map(formatCategoryLine)
      : ['暂无分类数据']),
  ]

  return lines.join('\n')
}

export function buildFeishuPostPayload(title: string, text: string) {
  return {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title,
          content: text.split('\n').map((line) => [{ tag: 'text', text: line || ' ' }]),
        },
      },
    },
  }
}

export function buildFeishuNewPostText(
  post: Pick<PostWithTags, 'title' | 'slug' | 'description' | 'category' | 'tags' | 'published_at' | 'view_count'>,
  context: {
    siteName: string
    siteUrl: string
    generatedAtText: string
    publicPosts: number
    totalViews: number
  },
) {
  const tags = post.tags.length > 0 ? post.tags.join('、') : '无'
  const lines = [
    `${context.siteName}新文章发布`,
    `时间：${context.generatedAtText}（北京时间）`,
    '',
    `标题：${post.title}`,
    `分类：${post.category || '未分类'}`,
    `标签：${tags}`,
    `摘要：${post.description?.trim() || '暂无摘要'}`,
    `链接：${buildPostUrl(context.siteUrl, post.slug)}`,
    '',
    `当前公开文章：${context.publicPosts} 篇`,
    `累计浏览：${context.totalViews} 次`,
    `本文浏览：${post.view_count} 次`,
  ]

  return lines.join('\n')
}

function toBase64(bytes: ArrayBuffer) {
  let binary = ''
  const data = new Uint8Array(bytes)
  for (let i = 0; i < data.length; i += 1) {
    binary += String.fromCharCode(data[i])
  }
  return btoa(binary)
}

export async function createFeishuSign(secret: string, timestamp: number) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${timestamp}\n${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signed = await crypto.subtle.sign('HMAC', key, new Uint8Array())
  return toBase64(signed)
}

export async function sendFeishuWebhook(
  webhook: string,
  payload: ReturnType<typeof buildFeishuPostPayload>,
  secret?: string,
  now = new Date(),
) {
  const timestamp = Math.floor(now.getTime() / 1000)
  const signedPayload = secret?.trim()
    ? {
        timestamp,
        sign: await createFeishuSign(secret.trim(), timestamp),
        ...payload,
      }
    : payload

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signedPayload),
  })
  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`飞书机器人推送失败：HTTP ${response.status} ${responseText}`)
  }

  try {
    const body = JSON.parse(responseText) as { code?: number; StatusCode?: number; msg?: string; StatusMessage?: string }
    const code = body.code ?? body.StatusCode ?? 0
    if (code !== 0) {
      throw new Error(body.msg || body.StatusMessage || responseText)
    }
    return body
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { raw: responseText }
    }
    if (error instanceof Error) {
      throw new Error(`飞书机器人推送失败：${error.message}`)
    }
    return { raw: responseText }
  }
}

export async function pushFeishuBlogReport(
  env: FeishuReportEnv,
  options: PushFeishuReportOptions = {},
) {
  const now = options.now || new Date()
  const report = await collectBlogReport(env.DB, env, now)
  const text = buildFeishuReportText(report)
  const payload = buildFeishuPostPayload(`${report.siteName}数据报告｜${report.momentLabel}`, text)

  if (options.dryRun) {
    return {
      sent: false,
      dryRun: true,
      text,
      payload,
      report,
    }
  }

  const webhook = env.FEISHU_BOT_WEBHOOK?.trim()
  if (!webhook) {
    throw new Error('缺少 FEISHU_BOT_WEBHOOK，无法推送飞书机器人。')
  }

  const feishuResponse = await sendFeishuWebhook(webhook, payload, env.FEISHU_BOT_SECRET, now)
  await setSetting(env.DB, SNAPSHOT_KEY, JSON.stringify(createSnapshot(report)))

  return {
    sent: true,
    dryRun: false,
    text,
    payload,
    report,
    feishuResponse,
  }
}

export async function pushFeishuNewPostNotification(
  env: FeishuReportEnv,
  post: PostWithTags,
  options: PushFeishuNewPostOptions = {},
) {
  if (!isPublicPost(post)) {
    return {
      sent: false,
      skipped: true,
      reason: 'post_not_public',
    }
  }

  const now = options.now || new Date()
  await ensureSchema(env.DB)

  const statsRow = await env.DB
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'published' AND password IS NULL AND is_hidden = 0 AND deleted_at IS NULL THEN 1 ELSE 0 END) AS public_posts,
        COALESCE(SUM(CASE WHEN deleted_at IS NULL THEN view_count ELSE 0 END), 0) AS total_views
       FROM posts`,
    )
    .first<NewPostStatsRow>()

  const siteName = getReportSiteName(env)
  const text = buildFeishuNewPostText(post, {
    siteName,
    siteUrl: normalizeSiteUrl(env.NEXT_PUBLIC_SITE_URL),
    generatedAtText: formatChinaTime(now),
    publicPosts: toNumber(statsRow?.public_posts),
    totalViews: toNumber(statsRow?.total_views),
  })
  const payload = buildFeishuPostPayload(`${siteName}新文章｜${post.title}`, text)

  if (options.dryRun) {
    return {
      sent: false,
      dryRun: true,
      text,
      payload,
    }
  }

  const webhook = env.FEISHU_BOT_WEBHOOK?.trim()
  if (!webhook) {
    throw new Error('缺少 FEISHU_BOT_WEBHOOK，无法推送飞书机器人。')
  }

  const feishuResponse = await sendFeishuWebhook(webhook, payload, env.FEISHU_BOT_SECRET, now)

  return {
    sent: true,
    dryRun: false,
    text,
    payload,
    feishuResponse,
  }
}

export function enqueueFeishuNewPostNotification(
  env: FeishuReportEnv,
  post: PostWithTags,
  waitUntil?: (promise: Promise<unknown>) => void,
) {
  const task = pushFeishuNewPostNotification(env, post).catch((error) => {
    console.error('Feishu new post notification failed:', error)
  })

  if (waitUntil) {
    waitUntil(task)
    return
  }

  void task
}
