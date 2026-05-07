'use client'

import { useEffect } from 'react'
import { markPostUpdateSeen } from '@/components/PostUpdateBadge'
import type { PostWithTags } from '@/lib/repositories/types'

export function PostUpdateSeenMarker({
  post,
}: {
  post: Pick<PostWithTags, 'slug' | 'published_at' | 'content_updated_at'>
}) {
  useEffect(() => {
    markPostUpdateSeen(post)
  }, [post])

  return null
}
