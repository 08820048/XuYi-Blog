import { describe, expect, it } from 'vitest'
import { decodeRouteSegment, getCategoryPath } from '@/lib/route-segments'

describe('route segment helpers', () => {
  it('decodes encoded Chinese category slugs from route params', () => {
    expect(decodeRouteSegment('%E6%8A%80%E6%9C%AF')).toBe('技术')
  })

  it('keeps malformed route params unchanged', () => {
    expect(decodeRouteSegment('%E6%8A%')).toBe('%E6%8A%')
  })

  it('encodes category slugs as a single path segment', () => {
    expect(getCategoryPath('技术 随笔')).toBe('/category/%E6%8A%80%E6%9C%AF%20%E9%9A%8F%E7%AC%94')
  })
})
