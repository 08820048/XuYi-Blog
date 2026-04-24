import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getFriendLinks } from '@/lib/db'
import { FriendLinksManager } from './FriendLinksManager'

export const metadata = { title: '友联管理' }

export default async function FriendLinksPage() {
  const env = await getAppCloudflareEnv()
  let links: Awaited<ReturnType<typeof getFriendLinks>> = []

  if (env?.DB) {
    try {
      links = await getFriendLinks(env.DB)
    } catch (error) {
      console.error('Friend links fetch error:', error)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--editor-ink)]">友联管理</h1>
        <p className="mt-0.5 text-sm text-[var(--editor-muted)]">
          共 {links.length} 个友联
        </p>
      </div>
      <FriendLinksManager initialLinks={links} />
    </div>
  )
}
