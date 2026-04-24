import { getAppCloudflareEnv } from '@/lib/cloudflare'
import { getSetting } from '@/lib/db'
import { renderMarkdownContent } from '@/lib/markdown'
import { getSiteHeaderData } from '@/lib/site'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { CodeHighlightEnhancer } from '@/components/CodeHighlightEnhancer'
import { MathRenderEnhancer } from '@/components/MathRenderEnhancer'
import { TwitterEmbedsEnhancer } from '@/components/TwitterEmbedsEnhancer'

export const metadata = {
  title: '关于我',
  description: "关于 XuYi'Blog 和站点作者。",
}

export const dynamic = 'force-dynamic'

const fallbackMarkdown = `# 关于我

这里还没有填写内容。

站点管理员可以进入后台 **站点设置 -> 关于我** 编写这页内容。
`

export default async function AboutPage() {
  const env = await getAppCloudflareEnv()
  const contentContainerId = 'about-markdown-content'

  if (!env?.DB) {
    const html = await renderMarkdownContent(fallbackMarkdown)

    return (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <SiteHeader />
        <main className="page-main mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
          <AboutContent containerId={contentContainerId} html={html} />
        </main>
        <SiteFooter />
      </div>
    )
  }

  const [headerData, aboutMarkdown] = await Promise.all([
    getSiteHeaderData(env.DB),
    getSetting(env.DB, 'about_markdown'),
  ])
  const markdown = aboutMarkdown?.trim() ? aboutMarkdown : fallbackMarkdown
  const html = await renderMarkdownContent(markdown)

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader
        initialTheme={headerData.defaultTheme}
        navLinks={headerData.navLinks}
        categories={headerData.categories}
      />

      <main className="page-main mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <AboutContent containerId={contentContainerId} html={html} />
      </main>

      <SiteFooter />
    </div>
  )
}

function AboutContent({
  containerId,
  html,
}: {
  containerId: string
  html: string
}) {
  return (
    <article>
      <header className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--editor-accent)]">
          About
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--editor-ink)] sm:text-4xl">
          关于我
        </h1>
      </header>

      <div
        id={containerId}
        className="rich-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <CodeHighlightEnhancer containerId={containerId} html={html} />
      <MathRenderEnhancer containerId={containerId} html={html} />
      <TwitterEmbedsEnhancer containerId={containerId} html={html} />
    </article>
  )
}
