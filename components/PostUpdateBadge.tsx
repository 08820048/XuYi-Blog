'use client'

import { hasPostUpdate } from '@/lib/post-update'
import type { PostWithTags } from '@/lib/repositories/types'
import { useEffect, useState } from 'react'

export const POST_UPDATE_SEEN_EVENT = 'qmblog:post-update-seen'
const POST_UPDATE_SEEN_KEY_PREFIX = 'qmblog:post-update-seen:'

type UpdateBadgePost = Pick<PostWithTags, 'slug' | 'published_at' | 'content_updated_at'>

function getSeenStorageKey(slug: string) {
  return `${POST_UPDATE_SEEN_KEY_PREFIX}${slug}`
}

function getSeenUpdatedAt(slug: string) {
  if (typeof window === 'undefined') return 0

  try {
    const value = window.localStorage.getItem(getSeenStorageKey(slug))
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  } catch {
    return 0
  }
}

function isUnseenPostUpdate(post: UpdateBadgePost) {
  if (!hasPostUpdate(post) || !post.content_updated_at) return false
  if (typeof window === 'undefined') return true

  return getSeenUpdatedAt(post.slug) < post.content_updated_at
}

export function markPostUpdateSeen(post: UpdateBadgePost) {
  if (typeof window === 'undefined' || !hasPostUpdate(post) || !post.content_updated_at) return

  try {
    window.localStorage.setItem(getSeenStorageKey(post.slug), String(post.content_updated_at))
  } catch {
    return
  }

  window.dispatchEvent(new CustomEvent(POST_UPDATE_SEEN_EVENT, {
    detail: {
      slug: post.slug,
      contentUpdatedAt: post.content_updated_at,
    },
  }))
}

export function PostUpdateBadge({
  post,
  className = '',
}: {
  post: UpdateBadgePost
  className?: string
}) {
  const [visible, setVisible] = useState(() => hasPostUpdate(post))

  useEffect(() => {
    const sync = () => setVisible(isUnseenPostUpdate(post))

    sync()

    const onStorage = (event: StorageEvent) => {
      if (event.key === getSeenStorageKey(post.slug)) sync()
    }

    const onSeen = (event: Event) => {
      const detail = (event as CustomEvent<{ slug?: string }>).detail
      if (detail?.slug === post.slug) sync()
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(POST_UPDATE_SEEN_EVENT, onSeen)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(POST_UPDATE_SEEN_EVENT, onSeen)
    }
  }, [post])

  if (!visible || !post.content_updated_at) return null

  return (
    <span
      title={`更新于 ${new Date(post.content_updated_at * 1000).toLocaleDateString('zh-CN')}`}
      className={[
        'inline-flex flex-shrink-0 items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-emerald-600 dark:text-emerald-400',
        className,
      ].filter(Boolean).join(' ')}
    >
      有更新
    </span>
  )
}
