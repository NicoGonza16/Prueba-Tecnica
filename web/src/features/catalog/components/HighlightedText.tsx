import type { TextRange } from '../lib/searchTree'

type HighlightedTextProps = {
  text: string
  /** Part of `text` to highlight; nothing is highlighted when null or empty. */
  range?: TextRange | null
}

/**
 * Renders `text` with `range` wrapped in `<mark>`. Built from plain React text
 * nodes, so user data is never interpreted as HTML.
 */
export function HighlightedText({ text, range }: HighlightedTextProps) {
  if (!range || range.start >= range.end) return <>{text}</>

  return (
    <>
      {text.slice(0, range.start)}
      <mark className="tree-node__match">{text.slice(range.start, range.end)}</mark>
      {text.slice(range.end)}
    </>
  )
}
