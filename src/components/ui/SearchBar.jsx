import { Search } from 'lucide-react'

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--text-tertiary)' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-56 rounded-lg border pl-8 pr-3 py-2 text-sm outline-none transition-colors focus:ring-1"
        style={inputStyle}
      />
    </div>
  )
}
