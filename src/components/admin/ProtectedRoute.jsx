import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AdminRoute({ children }) {
  const { user, profile, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neural-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neural-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neural-950 text-white">
        <h1 className="mb-4 text-4xl font-bold">Access Denied</h1>
        <p className="text-neural-400">You do not have permission to access this area.</p>
      </div>
    )
  }

  return children
}
