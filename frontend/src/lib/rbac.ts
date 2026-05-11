import type { Role } from '@/types'

export function hasRole(userRole: Role | undefined, roles: Role[]): boolean {
  return Boolean(userRole && roles.includes(userRole))
}

export function canManageKB(role: Role | undefined): boolean {
  return hasRole(role, ['admin', 'supervisor'])
}

export function canReadAudit(role: Role | undefined): boolean {
  return hasRole(role, ['admin', 'supervisor'])
}

export function canManageUsers(role: Role | undefined): boolean {
  return role === 'admin'
}
