'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import type { FriendLinkRow } from '@/lib/db'

interface EditableFriendLink {
  id: number
  name: string
  url: string
  description: string
  avatar_url: string | null
  sort_order: number
  is_visible: number
}

const emptyDraft = {
  name: '',
  url: '',
  description: '',
  avatar_url: '',
  sort_order: 0,
  is_visible: 1,
}

function toEditable(link: FriendLinkRow): EditableFriendLink {
  return {
    id: link.id,
    name: link.name,
    url: link.url,
    description: link.description || '',
    avatar_url: link.avatar_url,
    sort_order: link.sort_order,
    is_visible: link.is_visible,
  }
}

export function FriendLinksManager({ initialLinks }: { initialLinks: FriendLinkRow[] }) {
  const [links, setLinks] = useState(initialLinks.map(toEditable))
  const [draft, setDraft] = useState(emptyDraft)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editing, setEditing] = useState(emptyDraft)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteModal, setDeleteModal] = useState<EditableFriendLink | null>(null)
  const router = useRouter()
  const toast = useToast()

  const updateDraft = (field: keyof typeof emptyDraft, value: string | number) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const updateEditing = (field: keyof typeof emptyDraft, value: string | number) => {
    setEditing((current) => ({ ...current, [field]: value }))
  }

  const submitNew = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim() || !draft.url.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/friend-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || '添加失败')
      }

      setDraft(emptyDraft)
      router.refresh()
      toast.success('友联已添加')
      const refreshed = await fetch('/api/admin/friend-links').then((r) => r.json()) as { links?: FriendLinkRow[] }
      setLinks((refreshed.links || []).map(toEditable))
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (link: EditableFriendLink) => {
    setEditingId(link.id)
    setEditing({
      name: link.name,
      url: link.url,
      description: link.description,
      avatar_url: link.avatar_url || '',
      sort_order: link.sort_order,
      is_visible: link.is_visible,
    })
  }

  const submitEdit = async () => {
    if (!editingId || !editing.name.trim() || !editing.url.trim()) return

    try {
      const res = await fetch('/api/admin/friend-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editing }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || '更新失败')
      }

      setLinks((current) =>
        current
          .map((item) => item.id === editingId ? { ...item, ...editing, avatar_url: editing.avatar_url || null } : item)
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      )
      setEditingId(null)
      router.refresh()
      toast.success('友联已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败')
    }
  }

  const confirmDelete = async () => {
    if (!deleteModal) return false

    try {
      const res = await fetch('/api/admin/friend-links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteModal.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || '删除失败')
      }

      setLinks((current) => current.filter((item) => item.id !== deleteModal.id))
      setDeleteModal(null)
      router.refresh()
      toast.success('友联已删除')
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
      return false
    }
  }

  const renderFields = (
    values: typeof emptyDraft,
    update: (field: keyof typeof emptyDraft, value: string | number) => void,
  ) => (
    <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr_1.2fr_0.7fr_auto]">
      <label className="space-y-1">
        <span className="block text-xs text-[var(--editor-muted)]">名称</span>
        <input
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          placeholder="如：某某博客"
          className="h-10 w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 text-sm text-[var(--editor-ink)] outline-none transition focus:border-[var(--editor-ink)]"
        />
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-[var(--editor-muted)]">链接</span>
        <input
          value={values.url}
          onChange={(event) => update('url', event.target.value)}
          placeholder="https://example.com"
          className="h-10 w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 text-sm text-[var(--editor-ink)] outline-none transition focus:border-[var(--editor-ink)]"
        />
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-[var(--editor-muted)]">头像</span>
        <input
          value={values.avatar_url}
          onChange={(event) => update('avatar_url', event.target.value)}
          placeholder="https://example.com/avatar.png"
          className="h-10 w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 text-sm text-[var(--editor-ink)] outline-none transition focus:border-[var(--editor-ink)]"
        />
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-[var(--editor-muted)]">排序</span>
        <input
          type="number"
          value={values.sort_order}
          onChange={(event) => update('sort_order', Number(event.target.value))}
          className="h-10 w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 text-sm text-[var(--editor-ink)] outline-none transition focus:border-[var(--editor-ink)]"
        />
      </label>
      <label className="flex h-10 items-center gap-2 self-end text-xs text-[var(--editor-muted)]">
        <input
          type="checkbox"
          checked={values.is_visible === 1}
          onChange={(event) => update('is_visible', event.target.checked ? 1 : 0)}
          className="accent-[var(--editor-accent)]"
        />
        显示
      </label>
      <label className="space-y-1 lg:col-span-5">
        <span className="block text-xs text-[var(--editor-muted)]">描述</span>
        <input
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="一句话介绍这个站点"
          className="h-10 w-full rounded-lg border border-[var(--editor-line)] bg-[var(--background)] px-3 text-sm text-[var(--editor-ink)] outline-none transition focus:border-[var(--editor-ink)]"
        />
      </label>
    </div>
  )

  return (
    <div className="space-y-6">
      <form onSubmit={submitNew} className="rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)] p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--editor-ink)]">添加友联</h2>
        {renderFields(draft, updateDraft)}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !draft.name.trim() || !draft.url.trim()}
            className="rounded-lg bg-[var(--editor-ink)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? '添加中...' : '添加'}
          </button>
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-[var(--editor-line)] bg-[var(--editor-panel)]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[var(--editor-line)] bg-[var(--editor-soft)] px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--editor-muted)]">站点</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--editor-muted)]">状态</span>
          <span className="text-right text-xs font-semibold uppercase tracking-wide text-[var(--editor-muted)]">操作</span>
        </div>
        <div className="divide-y divide-[var(--editor-line)]">
          {links.map((link) => (
            <div key={link.id} className="px-5 py-4">
              {editingId === link.id ? (
                <div className="space-y-3">
                  {renderFields(editing, updateEditing)}
                  <div className="flex gap-2">
                    <button type="button" onClick={submitEdit} className="text-xs text-emerald-600 hover:underline">保存</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-xs text-[var(--editor-muted)] hover:underline">取消</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--editor-line)] bg-[var(--editor-soft)] text-sm font-semibold text-[var(--editor-muted)]">
                      {link.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={link.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        link.name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium text-[var(--editor-ink)] hover:text-[var(--editor-accent)]">
                        {link.name}
                      </a>
                      <p className="truncate text-xs text-[var(--editor-muted)]">{link.description || link.url}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${link.is_visible ? 'bg-emerald-50 text-emerald-600' : 'bg-[var(--editor-soft)] text-[var(--editor-muted)]'}`}>
                    {link.is_visible ? '显示' : '隐藏'}
                  </span>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => startEditing(link)} className="text-xs text-[var(--editor-accent)] hover:underline">编辑</button>
                    <button type="button" onClick={() => setDeleteModal(link)} className="text-xs text-rose-500 hover:underline">删除</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {links.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-[var(--editor-muted)]">暂无友联</div>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmDelete}
        title="确认删除"
        description={`确定删除友联「${deleteModal?.name}」吗？`}
        confirmText="删除"
        type="danger"
      />
    </div>
  )
}
