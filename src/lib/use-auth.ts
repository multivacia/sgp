import { useContext } from 'react'
import { AuthContext } from './auth-context-instance'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
