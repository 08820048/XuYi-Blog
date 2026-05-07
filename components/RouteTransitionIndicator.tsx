'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

type TransitionState = 'idle' | 'loading' | 'done'

function getUrlKey(pathname: string, searchParams: { toString(): string }) {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

function isPlainInternalNavigation(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (event.defaultPrevented || event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false

  let targetUrl: URL
  try {
    targetUrl = new URL(anchor.href, window.location.href)
  } catch {
    return false
  }

  if (targetUrl.origin !== window.location.origin) return false

  const currentUrl = new URL(window.location.href)
  const sameRoute =
    targetUrl.pathname === currentUrl.pathname &&
    targetUrl.search === currentUrl.search

  if (sameRoute && targetUrl.hash === currentUrl.hash) return false
  if (sameRoute && targetUrl.hash) return false

  return true
}

export function RouteTransitionIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentUrlKey = useMemo(
    () => getUrlKey(pathname, searchParams),
    [pathname, searchParams],
  )
  const [state, setState] = useState<TransitionState>('idle')
  const lastUrlKeyRef = useRef(currentUrlKey)
  const hideTimerRef = useRef<number | null>(null)
  const fallbackTimerRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }

    const clearFallbackTimer = () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }

    const complete = () => {
      if (!activeRef.current) return

      activeRef.current = false
      clearFallbackTimer()
      setState('done')
      clearHideTimer()
      hideTimerRef.current = window.setTimeout(() => {
        setState('idle')
        hideTimerRef.current = null
      }, 260)
    }

    const reset = () => {
      activeRef.current = false
      clearHideTimer()
      clearFallbackTimer()
      setState('idle')
    }

    const start = () => {
      activeRef.current = true
      clearHideTimer()
      clearFallbackTimer()
      setState('loading')
      fallbackTimerRef.current = window.setTimeout(() => {
        complete()
      }, 2500)
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!isPlainInternalNavigation(event, anchor)) return

      start()
    }
    const handlePageRestore = () => reset()
    const handleFocus = () => {
      window.setTimeout(() => complete(), 0)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        window.setTimeout(() => complete(), 0)
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    window.addEventListener('popstate', start)
    window.addEventListener('pageshow', handlePageRestore)
    window.addEventListener('pagehide', handlePageRestore)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearHideTimer()
      clearFallbackTimer()
      document.removeEventListener('click', handleClick, { capture: true })
      window.removeEventListener('popstate', start)
      window.removeEventListener('pageshow', handlePageRestore)
      window.removeEventListener('pagehide', handlePageRestore)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (lastUrlKeyRef.current === currentUrlKey) return

    lastUrlKeyRef.current = currentUrlKey
    if (state === 'idle') return

    activeRef.current = false

    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }

    const completeTimer = window.setTimeout(() => {
      setState((current) => (current === 'idle' ? current : 'done'))
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
      }
      hideTimerRef.current = window.setTimeout(() => {
        setState('idle')
        hideTimerRef.current = null
      }, 260)
    }, 0)

    return () => window.clearTimeout(completeTimer)
  }, [currentUrlKey, state])

  return (
    <div
      className="route-transition"
      data-state={state}
      role="status"
      aria-live="polite"
      aria-hidden={state === 'idle'}
    >
      <div className="route-transition__bar" />
      <div className="route-transition__pill">
        <span className="route-transition__spinner" aria-hidden />
      </div>
    </div>
  )
}
