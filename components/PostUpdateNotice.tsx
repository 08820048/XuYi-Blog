import { formatPostUpdateDate, hasPostUpdate } from '@/lib/post-update'
import type { PostWithTags } from '@/lib/repositories/types'

export function PostUpdateNotice({
  post,
}: {
  post: Pick<PostWithTags, 'published_at' | 'content_updated_at'>
}) {
  if (!hasPostUpdate(post) || !post.content_updated_at) return null

  return (
    <section className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-[var(--editor-muted)]">
      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
        有更新
      </span>
      <span>更新于 {formatPostUpdateDate(post.content_updated_at)}</span>
      <span aria-hidden>·</span>
      <span className="font-mono text-[11px]">+ 新增 / - 删除 / D 更新前 / U 更新后</span>
    </section>
  )
}
