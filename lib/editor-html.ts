'use client'

import { DOMParser as PMDOMParser } from '@tiptap/pm/model'
import { Selection } from '@tiptap/pm/state'
import type { EditorInstance } from 'novel'
import { transformHtmlMathDelimiters } from '@/lib/math-html'

export function setEditorContentFromHtml(editor: EditorInstance, html: string) {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = transformHtmlMathDelimiters(html)

  const nextDoc = PMDOMParser.fromSchema(editor.state.schema).parse(wrapper)
  const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, nextDoc.content)
  tr.setSelection(Selection.atStart(tr.doc))
  editor.view.dispatch(tr.scrollIntoView())
}
