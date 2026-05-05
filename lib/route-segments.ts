export function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export function encodeRouteSegment(segment: string): string {
  return encodeURIComponent(segment)
}

export function getCategoryPath(slug: string): string {
  return `/category/${encodeRouteSegment(slug)}`
}
