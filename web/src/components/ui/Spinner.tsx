type SpinnerProps = {
  /** Text announced to screen readers and, unless `inline`, shown next to the spinner. */
  label?: string
  /** Small variant meant to sit inside buttons or text; the label is visually hidden. */
  inline?: boolean
}

export function Spinner({ label = 'Cargando…', inline = false }: SpinnerProps) {
  if (inline) {
    return (
      <span className="spinner spinner--inline" role="status">
        <span className="spinner__circle" aria-hidden="true" />
        <span className="visually-hidden">{label}</span>
      </span>
    )
  }

  return (
    <div className="spinner" role="status">
      <span className="spinner__circle" aria-hidden="true" />
      <span className="spinner__label">{label}</span>
    </div>
  )
}
