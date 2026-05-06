import { createPostUpdateLineDiff, type InlineDiffPart, type PostUpdateDiffRow } from '@/lib/post-update'
import type { PostWithTags } from '@/lib/repositories/types'

function InlineParts({
  parts,
  fallback,
}: {
  parts?: InlineDiffPart[]
  fallback: string
}) {
  if (!parts) return <>{fallback || ' '}</>

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'same') {
          return <span key={index}>{part.text}</span>
        }
        return (
          <span key={index} className={`post-update-file-diff__word post-update-file-diff__word--${part.type}`}>
            {part.text}
          </span>
        )
      })}
    </>
  )
}

function DiffRow({ row }: { row: PostUpdateDiffRow }) {
  const marker = row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '

  return (
    <tr className={`post-update-file-diff__row post-update-file-diff__row--${row.type}`}>
      <td className="post-update-file-diff__line-num">{row.oldLine ?? ''}</td>
      <td className="post-update-file-diff__line-num">{row.newLine ?? ''}</td>
      <td className="post-update-file-diff__marker">{marker}</td>
      <td className="post-update-file-diff__code">
        <InlineParts parts={row.inline} fallback={row.text} />
      </td>
    </tr>
  )
}

export function PostUpdateDiffView({
  post,
}: {
  post: Pick<PostWithTags, 'title' | 'previous_content' | 'content'>
}) {
  const hunks = createPostUpdateLineDiff(post.previous_content, post.content)

  if (hunks.length === 0) return null

  return (
    <section className="post-update-file-diff mb-10" aria-label="文章更新 diff">
      <div className="post-update-file-diff__header">
        <div className="min-w-0">
          <div className="post-update-file-diff__path">posts/{post.title}.md</div>
          <div className="post-update-file-diff__summary">
            {hunks.length} 个变更片段
          </div>
        </div>
        <div className="post-update-file-diff__legend">
          <span className="post-update-file-diff__legend-add">+ 新增</span>
          <span className="post-update-file-diff__legend-remove">- 删除</span>
        </div>
      </div>
      <div className="post-update-file-diff__body">
        <table>
          {hunks.map((hunk, hunkIndex) => (
            <tbody key={`hunk-${hunkIndex}`}>
              <tr className="post-update-file-diff__hunk">
                <td colSpan={4}>
                  @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                </td>
              </tr>
              {hunk.rows.map((row, rowIndex) => (
                <DiffRow
                  key={`${hunkIndex}:${rowIndex}:${row.oldLine ?? ''}:${row.newLine ?? ''}:${row.type}`}
                  row={row}
                />
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  )
}
