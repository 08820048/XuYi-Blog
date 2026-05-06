import { createPostUpdateDiff, formatPostUpdateDate, hasPostUpdate } from '@/lib/post-update'
import type { PostWithTags } from '@/lib/repositories/types'

export function PostUpdateNotice({
  post,
}: {
  post: Pick<PostWithTags, 'published_at' | 'content_updated_at' | 'previous_content' | 'content'>
}) {
  if (!hasPostUpdate(post) || !post.content_updated_at) return null

  const diff = createPostUpdateDiff(post.previous_content, post.content)
  const hasDiff = diff.added.length > 0 || diff.removed.length > 0

  return (
    <section className="mb-8 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-[var(--editor-ink)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          有更新
        </span>
        <span className="text-xs text-[var(--editor-muted)]">
          更新于 {formatPostUpdateDate(post.content_updated_at)}
        </span>
      </div>

      {hasDiff ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {diff.added.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">新增 / 调整</div>
              <ul className="space-y-2">
                {diff.added.map((item, index) => (
                  <li key={`${index}:${item}`} className="border-l-2 border-emerald-500/45 pl-3 leading-relaxed text-[var(--editor-muted)]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {diff.removed.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold text-[var(--stone-gray)]">上一版中移除</div>
              <ul className="space-y-2">
                {diff.removed.map((item, index) => (
                  <li key={`${index}:${item}`} className="border-l-2 border-[var(--editor-line)] pl-3 leading-relaxed text-[var(--stone-gray)] line-through decoration-[var(--stone-gray)]/50">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-[var(--editor-muted)]">
          这篇文章在发布后更新过正文内容。
        </p>
      )}
    </section>
  )
}
