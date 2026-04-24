'use client'

import { useState } from 'react'

interface Props {
  initialValue: string
  onSave: (value: string) => void
  saving: boolean
}

const defaultAboutMarkdown = `# 关于我

这里写你的自我介绍。

你可以使用 Markdown，例如：

- 你是谁
- 正在做什么
- 常用联系方式
- 想长期记录的主题
`

export function AboutMarkdownEditor({ initialValue, onSave, saving }: Props) {
  const [value, setValue] = useState(initialValue || defaultAboutMarkdown)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--editor-ink)]">关于我内容</h2>
        <p className="mt-1 text-sm text-[var(--editor-muted)]">
          这里支持 Markdown。保存后会渲染到前台的 /about 页面。
        </p>
      </div>

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        spellCheck={false}
        className="min-h-[420px] w-full resize-y rounded-xl border border-[var(--editor-line)] bg-[var(--background)] px-4 py-3 font-mono text-sm leading-7 text-[var(--editor-ink)] outline-none transition-colors placeholder:text-[var(--editor-muted)] focus:border-[var(--editor-accent)]"
        placeholder="# 关于我"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--editor-muted)]">
          支持标题、列表、链接、图片、代码块和数学公式。
        </p>
        <button
          type="button"
          onClick={() => onSave(value)}
          disabled={saving}
          className="rounded-lg bg-[var(--editor-accent)] px-4 py-2 text-sm font-medium text-[var(--editor-accent-ink)] transition hover:brightness-105 disabled:opacity-60"
        >
          {saving ? '保存中...' : '保存关于我'}
        </button>
      </div>
    </div>
  )
}
