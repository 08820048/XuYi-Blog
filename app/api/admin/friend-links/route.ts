import {
  createFriendLink,
  deleteFriendLink,
  getFriendLinks,
  updateFriendLink,
  type FriendLinkInput,
} from '@/lib/db'
import {
  ensureAuthenticatedRequest,
  getRouteEnvWithDb,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

interface FriendLinkBody {
  id?: number
  name?: string
  url?: string
  description?: string
  avatar_url?: string
  sort_order?: number
  is_visible?: number | boolean
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function normalizePayload(body: FriendLinkBody): FriendLinkInput | { error: string } {
  const name = (body.name || '').trim()
  const url = normalizeUrl(body.url || '')
  const description = (body.description || '').trim()
  const avatarUrl = (body.avatar_url || '').trim()
  const sortOrder = Number(body.sort_order || 0)

  if (!name) return { error: '名称不能为空' }
  if (!url) return { error: '链接不能为空' }

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { error: '链接必须是 http 或 https 地址' }
    }
  } catch {
    return { error: '链接格式不正确' }
  }

  if (avatarUrl) {
    try {
      const parsed = new URL(normalizeUrl(avatarUrl))
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { error: '头像链接必须是 http 或 https 地址' }
      }
    } catch {
      return { error: '头像链接格式不正确' }
    }
  }

  return {
    name,
    url,
    description,
    avatar_url: avatarUrl ? normalizeUrl(avatarUrl) : null,
    sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
    is_visible: body.is_visible === 0 || body.is_visible === false ? 0 : 1,
  }
}

export async function GET(req: NextRequest) {
  try {
    const route = await getRouteEnvWithDb('DB not available')
    if (!route.ok) return route.response

    const authError = await ensureAuthenticatedRequest(req, route.db)
    if (authError) return authError

    const links = await getFriendLinks(route.db)
    return jsonOk({ links })
  } catch (err) {
    return jsonError(String(err), 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const route = await getRouteEnvWithDb('DB not available')
    if (!route.ok) return route.response

    const authError = await ensureAuthenticatedRequest(req, route.db, '未授权')
    if (authError) return authError

    const body = await parseJsonBody<FriendLinkBody>(req)
    const payload = normalizePayload(body)
    if ('error' in payload) return jsonError(payload.error, 400)

    await createFriendLink(route.db, payload)
    return jsonOk({ success: true })
  } catch (err) {
    return jsonError(String(err), 500)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const route = await getRouteEnvWithDb('DB not available')
    if (!route.ok) return route.response

    const authError = await ensureAuthenticatedRequest(req, route.db, '未授权')
    if (authError) return authError

    const body = await parseJsonBody<FriendLinkBody>(req)
    const id = Number(body.id)
    if (!Number.isFinite(id) || id <= 0) return jsonError('参数不完整', 400)

    const payload = normalizePayload(body)
    if ('error' in payload) return jsonError(payload.error, 400)

    await updateFriendLink(route.db, id, payload)
    return jsonOk({ success: true })
  } catch (err) {
    return jsonError(String(err), 500)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const route = await getRouteEnvWithDb('DB not available')
    if (!route.ok) return route.response

    const authError = await ensureAuthenticatedRequest(req, route.db, '未授权')
    if (authError) return authError

    const body = await parseJsonBody<FriendLinkBody>(req)
    const id = Number(body.id)
    if (!Number.isFinite(id) || id <= 0) return jsonError('参数不完整', 400)

    await deleteFriendLink(route.db, id)
    return jsonOk({ success: true })
  } catch (err) {
    return jsonError(String(err), 500)
  }
}
