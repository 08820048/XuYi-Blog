'use client'

import { useEffect, useMemo, useState } from 'react'

interface HeadingItem {
  id: string
  text: string
  level: 1 | 2 | 3
}

interface ArticleTableOfContentsProps {
  containerId: string
}

function slugifyHeading(text: string, index: number) {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return `article-heading-${index + 1}${base ? `-${base}` : ''}`
}

function getHeadingLevel(tagName: string): HeadingItem['level'] {
  if (tagName === 'H1') return 1
  if (tagName === 'H2') return 2
  return 3
}

export function ArticleTableOfContents({ containerId }: ArticleTableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const container = document.getElementById(containerId)
    if (!container) return

    const headingElements = Array.from(
      container.querySelectorAll<HTMLHeadingElement>('h1, h2, h3'),
    ).filter((heading) => heading.textContent?.trim())

    const seenIds = new Map<string, number>()
    const nextHeadings = headingElements.map((heading, index) => {
      const text = heading.textContent?.trim() || ''
      const existingId = heading.id.trim()
      let id = existingId || slugifyHeading(text, index)
      const seenCount = seenIds.get(id) || 0

      seenIds.set(id, seenCount + 1)
      if (seenCount > 0) {
        id = `${id}-${seenCount + 1}`
      }

      heading.id = id
      return {
        id,
        text,
        level: getHeadingLevel(heading.tagName),
      }
    })

    const frame = window.requestAnimationFrame(() => {
      setHeadings(nextHeadings)
      setActiveId((current) => current || nextHeadings[0]?.id || '')
    })

    if (nextHeadings.length === 0) {
      return () => window.cancelAnimationFrame(frame)
    }

    const visibleHeadings = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id
          if (!id) continue

          if (entry.isIntersecting) {
            visibleHeadings.set(id, entry.boundingClientRect.top)
          } else {
            visibleHeadings.delete(id)
          }
        }

        if (visibleHeadings.size > 0) {
          const nextActive = Array.from(visibleHeadings.entries()).sort((a, b) => a[1] - b[1])[0]?.[0]
          if (nextActive) setActiveId(nextActive)
          return
        }

        const passedHeading = headingElements
          .filter((heading) => heading.getBoundingClientRect().top < 120)
          .at(-1)

        if (passedHeading?.id) {
          setActiveId(passedHeading.id)
        }
      },
      {
        rootMargin: '-96px 0px -70% 0px',
        threshold: [0, 1],
      },
    )

    headingElements.forEach((heading) => observer.observe(heading))

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [containerId])

  const visibleHeadings = useMemo(() => headings.filter((heading) => heading.text), [headings])

  if (visibleHeadings.length < 2) return null

  return (
    <aside className="article-toc" aria-label="文章目录">
      <div className="article-toc__label">目录</div>
      <nav className="article-toc__nav">
        {visibleHeadings.map((heading) => {
          const isActive = heading.id === activeId
          return (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className="article-toc__link"
              data-level={heading.level}
              data-active={isActive ? 'true' : undefined}
            >
              <span className="article-toc__rule" aria-hidden />
              <span className="article-toc__text">{heading.text}</span>
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
