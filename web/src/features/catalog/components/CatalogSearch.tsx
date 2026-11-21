import { useId, type KeyboardEvent, type RefObject } from 'react'

type CatalogSearchProps = {
  value: string
  onChange: (value: string) => void
  /** Number of matching accounts, or null while there is no active search. */
  resultCount: number | null
  inputRef: RefObject<HTMLInputElement | null>
}

function describeCount(count: number | null): string {
  if (count === null) return ''
  if (count === 0) return 'Sin resultados'
  return count === 1 ? '1 cuenta coincide' : `${count} cuentas coinciden`
}

/** Search box of the tree panel. Filtering happens in memory (see `lib/searchTree`). */
export function CatalogSearch({ value, onChange, resultCount, inputRef }: CatalogSearchProps) {
  const id = useId()

  const clear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && value !== '') {
      event.preventDefault()
      onChange('')
    }
  }

  return (
    <div className="catalog-search" role="search">
      <label htmlFor={id} className="visually-hidden">
        Buscar por código o nombre
      </label>
      <input
        ref={inputRef}
        id={id}
        type="search"
        className="field__input catalog-search__input"
        placeholder="Buscar por código o nombre"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {value !== '' && (
        <button type="button" className="button button--ghost button--small" onClick={clear}>
          Limpiar búsqueda
        </button>
      )}
      <span className="visually-hidden" role="status">
        {describeCount(resultCount)}
      </span>
    </div>
  )
}
