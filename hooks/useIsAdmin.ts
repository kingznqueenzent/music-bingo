'use client'

import { useSyncExternalStore } from 'react'
import {
  ensureAdminAuthStore,
  getAdminAuthSnapshot,
  subscribeAdminAuth,
  type AdminAuthSnapshot,
} from '@/lib/admin-auth-store'

const serverSnapshot: AdminAuthSnapshot = {
  isAdmin: false,
  loading: true,
  ready: false,
}

function subscribe(listener: () => void) {
  ensureAdminAuthStore()
  return subscribeAdminAuth(listener)
}

/**
 * Shared admin access flag for header menus / guards.
 * Backed by a tab-level singleton so menu opens do not re-bootstrap auth
 * or flash between Host Portal and Admin controls.
 */
export function useIsAdmin(): AdminAuthSnapshot {
  return useSyncExternalStore(subscribe, getAdminAuthSnapshot, () => serverSnapshot)
}
