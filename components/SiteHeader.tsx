'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useEffect, useSyncExternalStore, type CSSProperties } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import { SearchEntry } from './SearchEntry'
import { ThemeDropdown } from '@/components/ThemeDropdown'
import { getClientThemePreference, subscribeToThemeChange, type Theme } from '@/lib/appearance'
import type { SiteCategoryLink, SiteNavLink } from '@/lib/site'

export type NavLink = SiteNavLink

interface SiteHeaderProps {
  navLinks?: NavLink[]
  categories?: SiteCategoryLink[]
  activeCategorySlug?: string | null
  stickyOnMobile?: boolean
  initialTheme?: Theme
  forceSpread?: boolean
}

const defaultNavLinks: NavLink[] = [
  { label: 'GitHub', url: 'https://github.com/08820048/XuYi-Blog', openInNewTab: true },
  { label: '关于我', url: '/about', openInNewTab: false },
  { label: '友联', url: '/links', openInNewTab: false },
  { label: 'RSS', url: '/feed.xml', openInNewTab: false },
]

function getIssueInfo() {
  const now = new Date()
  return { vol: now.getFullYear() - 2023, month: now.getMonth() + 1, year: now.getFullYear() }
}

function LogoImage({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/logo.jpg"
      alt="XuYi'Blog"
      width={32}
      height={32}
      className={`site-logo-image ${className}`}
    />
  )
}

export function SiteHeader({
  navLinks,
  categories = [],
  activeCategorySlug = null,
  stickyOnMobile = true,
  initialTheme = 'default',
  forceSpread = false,
}: SiteHeaderProps) {
  const links = navLinks && navLinks.length > 0 ? navLinks : defaultNavLinks
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [spreadProgress, setSpreadProgress] = useState(forceSpread ? 1 : 0)
  const categoryRef = useRef<HTMLDivElement>(null)
  const theme = useSyncExternalStore(
    subscribeToThemeChange,
    () => getClientThemePreference(initialTheme),
    () => initialTheme,
  )

  // 点击外部关闭分类下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (forceSpread) {
      return
    }

    let frame = 0
    const scrollRange = 220
    const syncProgress = () => {
      frame = 0
      setSpreadProgress(Math.max(0, Math.min(window.scrollY / scrollRange, 1)))
    }
    const scheduleSync = () => {
      if (frame) return
      frame = window.requestAnimationFrame(syncProgress)
    }

    syncProgress()
    window.addEventListener('scroll', scheduleSync, { passive: true })
    window.addEventListener('resize', scheduleSync)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleSync)
      window.removeEventListener('resize', scheduleSync)
    }
  }, [forceSpread])

  const activeCategory = categories.find(c => c.slug === activeCategorySlug)
  const effectiveSpreadProgress = forceSpread ? 1 : spreadProgress
  const spreadStyle = {
    '--site-header-spread-progress': effectiveSpreadProgress.toFixed(3),
  } as CSSProperties

  const renderLink = (link: NavLink, onClick?: () => void) => {
    const className = "text-[var(--editor-muted)] hover:text-[var(--editor-ink)] transition-colors duration-150"

    if (link.openInNewTab || link.url.startsWith('http')) {
      return (
        <a
          key={link.label}
          href={link.url}
          target={link.openInNewTab ? '_blank' : undefined}
          rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
          className={className}
          onClick={onClick}
        >
          {link.label}
        </a>
      )
    }

    return (
      <Link
        key={link.label}
        href={link.url}
        className={className}
        onClick={onClick}
      >
        {link.label}
      </Link>
    )
  }

  // 终端主题：logo 区域显示终端提示符
  const renderLogo = () => {
    if (theme === 'terminal') {
      return (
        <Link
          href="/"
          className="flex items-center gap-2 flex-shrink-0 text-[var(--editor-muted)] hover:text-[var(--editor-ink)] transition-colors duration-200"
          style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 13 }}
          suppressHydrationWarning
        >
          <LogoImage className="site-logo-image--terminal" />
          <span style={{ color: 'var(--editor-muted)' }}>xuyi@blog:~$</span>
          <span style={{ color: 'var(--editor-ink)' }}>./home</span>
        </Link>
      )
    }

    if (theme === 'editorial') {
      const { vol, month, year } = getIssueInfo()
      return (
        <div className="flex items-baseline gap-4 flex-shrink-0" suppressHydrationWarning>
          <Link
            href="/"
            className="site-logo-link transition-transform duration-200 hover:scale-105"
            aria-label="返回首页"
          >
            <LogoImage />
          </Link>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, letterSpacing: '0.15em', color: 'var(--editor-muted)' }}>
            VOL.{vol} · {year}年{month}月
          </span>
        </div>
      )
    }

    return (
      <Link
        href="/"
        className="site-logo-link transition-transform duration-200 hover:scale-105"
        aria-label="返回首页"
      >
        <LogoImage />
      </Link>
    )
  }

  return (
    <header className={`site-header ${stickyOnMobile ? 'sticky' : 'sm:sticky'} top-0 z-40 border-b border-[var(--editor-line)] bg-[var(--background)]/95 backdrop-blur-sm`}>
      <div className="site-header-inner mx-auto max-w-3xl px-4 sm:px-6" style={spreadStyle}>
        <div className="site-header-row h-14 flex items-center justify-between gap-4">
          <div className="site-header-primary min-w-0 flex items-center">
            {renderLogo()}
          </div>

          <div className="site-header-secondary flex flex-shrink-0 items-center justify-end gap-1">
            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-3 text-sm flex-shrink-0">
              {/* Category dropdown */}
              {categories.length > 0 && (
                <div ref={categoryRef} className="relative">
                  <button
                    onClick={() => setCategoryOpen(!categoryOpen)}
                    className={`inline-flex items-center gap-1 transition-colors duration-150 ${
                      activeCategorySlug
                        ? 'text-[var(--editor-accent)]'
                        : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)]'
                    }`}
                  >
                    {activeCategory?.name || '分类'}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${categoryOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {categoryOpen && (
                    <div className="absolute top-full left-0 mt-2 min-w-[140px] rounded-lg border border-[var(--editor-line)] bg-[var(--background)] shadow-lg py-1 z-50">
                      <Link
                        href="/"
                        onClick={() => setCategoryOpen(false)}
                        className={`block px-3 py-2 text-sm transition-colors ${
                          activeCategorySlug === null
                            ? 'text-[var(--editor-accent)] bg-[var(--editor-accent)]/5 font-medium'
                            : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)] hover:bg-[var(--editor-panel)]'
                        }`}
                      >
                        全部文章
                      </Link>
                      {categories.map(cat => (
                        <Link
                          key={cat.slug}
                          href={`/category/${cat.slug}`}
                          onClick={() => setCategoryOpen(false)}
                          className={`block px-3 py-2 text-sm transition-colors ${
                            activeCategorySlug === cat.slug
                              ? 'text-[var(--editor-accent)] bg-[var(--editor-accent)]/5 font-medium'
                              : 'text-[var(--editor-muted)] hover:text-[var(--editor-ink)] hover:bg-[var(--editor-panel)]'
                          }`}
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {links.map(link => renderLink(link))}
              <ThemeDropdown initialTheme={initialTheme} />
              <SearchEntry />
            </nav>

            {/* Mobile: search icon + hamburger */}
            <div className="sm:hidden flex items-center gap-1">
              <SearchEntry />
              <button
                className="p-2 text-[var(--editor-muted)] hover:text-[var(--editor-ink)] transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className={`
          sm:hidden transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'max-h-[70vh] overflow-visible border-t border-[var(--editor-line)]' : 'max-h-0 overflow-hidden'}
        `}
      >
        <div className="bg-[var(--background)]">
          {/* Mobile categories as horizontal pills */}
          {categories.length > 0 && (
            <div className="px-4 py-3 border-b border-[var(--editor-line)]">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCategorySlug === null
                      ? 'bg-[var(--editor-accent)] text-white'
                      : 'bg-[var(--editor-panel)] text-[var(--editor-muted)]'
                  }`}
                >
                  全部
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/category/${category.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeCategorySlug === category.slug
                        ? 'bg-[var(--editor-accent)] text-white'
                        : 'bg-[var(--editor-panel)] text-[var(--editor-muted)]'
                    }`}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <nav className="flex flex-col text-sm">
            {links.map(link => (
              <div key={link.label} className="px-4 py-3 border-b border-[var(--editor-line)]">
                {renderLink(link, () => setMobileMenuOpen(false))}
              </div>
            ))}
            <div className="px-4 py-3 border-t border-[var(--editor-line)] text-[var(--editor-muted)]">
              <ThemeDropdown
                initialTheme={initialTheme}
                inlineMenu
                fullWidth
                onThemeChange={() => setMobileMenuOpen(false)}
                buttonStyle={{
                  width: '100%',
                  justifyContent: 'space-between',
                  color: 'var(--editor-muted)',
                  fontSize: 14,
                }}
                dropdownStyle={{
                  background: 'var(--editor-panel)',
                }}
                itemStyle={{
                  padding: '10px 12px',
                  fontSize: 13,
                }}
              />
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
