import type { Database } from '@/lib/repositories/schema'
import { ensureSchema } from '@/lib/repositories/schema'
import type { FriendLinkRow } from '@/lib/repositories/types'

export interface FriendLinkInput {
  name: string
  url: string
  description?: string
  avatar_url?: string | null
  sort_order?: number
  is_visible?: number
}

function normalizeVisible(value: unknown) {
  return value === 0 || value === false ? 0 : 1
}

function normalizeSortOrder(value: unknown) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? Math.trunc(nextValue) : 0
}

export async function getFriendLinks(db: Database): Promise<FriendLinkRow[]> {
  await ensureSchema(db)
  return db
    .prepare(`
      SELECT id, name, url, description, avatar_url, sort_order, is_visible, created_at, updated_at
      FROM friend_links
      ORDER BY sort_order ASC, id ASC
    `)
    .all<FriendLinkRow>()
    .then((result) => result.results || [])
}

export async function getPublicFriendLinks(db: Database): Promise<FriendLinkRow[]> {
  await ensureSchema(db)
  return db
    .prepare(`
      SELECT id, name, url, description, avatar_url, sort_order, is_visible, created_at, updated_at
      FROM friend_links
      WHERE is_visible = 1
      ORDER BY sort_order ASC, id ASC
    `)
    .all<FriendLinkRow>()
    .then((result) => result.results || [])
}

export async function createFriendLink(db: Database, input: FriendLinkInput): Promise<void> {
  await ensureSchema(db)
  await db
    .prepare(`
      INSERT INTO friend_links (name, url, description, avatar_url, sort_order, is_visible, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
    `)
    .bind(
      input.name,
      input.url,
      input.description || '',
      input.avatar_url || null,
      normalizeSortOrder(input.sort_order),
      normalizeVisible(input.is_visible),
    )
    .run()
}

export async function updateFriendLink(db: Database, id: number, input: FriendLinkInput): Promise<void> {
  await ensureSchema(db)
  await db
    .prepare(`
      UPDATE friend_links
      SET name = ?, url = ?, description = ?, avatar_url = ?, sort_order = ?, is_visible = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `)
    .bind(
      input.name,
      input.url,
      input.description || '',
      input.avatar_url || null,
      normalizeSortOrder(input.sort_order),
      normalizeVisible(input.is_visible),
      id,
    )
    .run()
}

export async function deleteFriendLink(db: Database, id: number): Promise<void> {
  await ensureSchema(db)
  await db.prepare('DELETE FROM friend_links WHERE id = ?').bind(id).run()
}
