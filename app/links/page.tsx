import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getPublicFriendLinks } from '@/lib/db'
import { getSiteHeaderData } from '@/lib/site'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = {
  title: '友联',
  description: '一些值得顺路拜访的朋友与站点。',
}

export const dynamic = 'force-dynamic'

export default async function LinksPage() {
  const env = await getAppCloudflareEnv()
  if (!env?.DB) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <SiteHeader />
        <main className="page-main mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
          <h1 className="text-2xl font-semibold text-[var(--editor-ink)]">友联</h1>
          <p className="mt-4 text-sm text-[var(--editor-muted)]">数据库暂不可用。</p>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const [headerData, links] = await Promise.all([
    getSiteHeaderData(env.DB),
    getPublicFriendLinks(env.DB),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
        categories={headerData.categories}
      />

      <main className="page-main mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--editor-accent)]">
            Links
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--editor-ink)] sm:text-4xl">
            友联
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--editor-muted)]">
            一些值得顺路拜访的朋友与站点。
          </p>
        </header>

        {links.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)]/65 p-4 transition hover:border-[var(--editor-accent)]/40 hover:bg-[var(--editor-panel)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--editor-line)] bg-[var(--editor-soft)] text-base font-semibold text-[var(--editor-muted)]">
                    {link.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={link.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      link.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-[var(--editor-ink)] transition group-hover:text-[var(--editor-accent)]">
                      {link.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--editor-muted)]">
                      {link.description || link.url}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--editor-line)] bg-[var(--editor-panel)]/45 px-5 py-10 text-center">
            <p className="text-sm text-[var(--editor-muted)]">还没有公开显示的友联。</p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
