import { Search } from 'lucide-react'

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

export default function SearchBar({ value, onChange, placeholder = 'Search...', className = 'w-56' }) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--text-tertiary)' }}
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-11 w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:ring-1"
        style={inputStyle}
      />
    </div>
  )
}
