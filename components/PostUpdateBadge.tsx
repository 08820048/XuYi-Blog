import { hasPostUpdate } from '@/lib/post-update'
import type { PostWithTags } from '@/lib/repositories/types'

export function PostUpdateBadge({
  post,
  className = '',
}: {
  post: Pick<PostWithTags, 'published_at' | 'content_updated_at'>
  className?: string
}) {
  if (!hasPostUpdate(post)) return null

  return (
    <span
      className={[
        'inline-flex flex-shrink-0 items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-emerald-600 dark:text-emerald-400',
        className,
      ].filter(Boolean).join(' ')}
    >
      有更新
    </span>
  )
}
