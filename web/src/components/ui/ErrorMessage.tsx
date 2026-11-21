import type { ReactNode } from 'react'

type ErrorMessageProps = {
  title?: string
  message: string
  /** Extra technical detail (e.g. the raw backend `detail`), shown in smaller text. */
  detail?: string | null
  /** Optional action, typically a "Reintentar" button. */
  action?: ReactNode
  /** `banner` for full panels, `compact` for inline/form-level messages. */
  variant?: 'banner' | 'compact'
  id?: string
}

export function ErrorMessage({
  title,
  message,
  detail,
  action,
  variant = 'banner',
  id,
}: ErrorMessageProps) {
  return (
    <div id={id} className={`error-message error-message--${variant}`} role="alert">
      <div className="error-message__body">
        {title && <p className="error-message__title">{title}</p>}
        <p className="error-message__text">{message}</p>
        {detail && detail !== message && (
          <p className="error-message__detail">
            Detalle del servidor: {detail}
          </p>
        )}
      </div>
      {action && <div className="error-message__action">{action}</div>}
    </div>
  )
}
