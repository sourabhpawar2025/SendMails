import { useState, useRef, useEffect } from 'react'

/**
 * Dropdown with optional search and checkboxes for multi-select.
 * Use searchQuery to filter when there are many options.
 */
export default function CheckboxDropdown({ label, options, selected, onChange, placeholder = 'Select...', hint, searchPlaceholder = 'Search...' }) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const ref = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setSearchQuery('')
      }
    }
    if (open) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (open && searchInputRef.current) searchInputRef.current.focus()
  }, [open])

  const toggle = (value) => {
    const set = new Set(selected)
    if (set.has(value)) set.delete(value)
    else set.add(value)
    onChange(Array.from(set))
  }

  const q = (searchQuery || '').trim().toLowerCase()
  const filteredOptions = q
    ? options.filter((opt) => String(opt || '').toLowerCase().includes(q))
    : options

  const displayText = selected.length === 0
    ? placeholder
    : selected.length <= 2
      ? selected.join(', ')
      : `${selected.length} selected`

  return (
    <div ref={ref} className="relative">
      {label && <label className="mb-1 block text-xs text-slate-400">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-left text-sm text-slate-200 hover:border-slate-500 flex items-center justify-between"
      >
        <span className="truncate">{displayText}</span>
        <span className="ml-2 text-slate-500 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded border border-slate-600 bg-slate-800 shadow-xl flex flex-col max-h-64">
          <div className="sticky top-0 shrink-0 border-b border-slate-600 bg-slate-800 p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="overflow-auto max-h-48 min-h-[80px]">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                {options.length === 0 ? 'No options' : `No match for "${searchQuery}"`}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                    className="rounded border-slate-600 bg-slate-800 text-amber-500"
                  />
                  <span>{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
