import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AdminRoute({ children }) {
  const { user, profile, loading, profileLoading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <h1 className="mb-4 text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to access this area.</p>
      </div>
    )
  }

  return children
}
