import type { User } from '@/types'

const TOKEN_KEY = 'claviar_token'
const USER_KEY = 'claviar_user'

export const authStore = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: (): User | null => { try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') } catch { return null } },
  set(token: string, user: User) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)) },
  setUser(user: User) { localStorage.setItem(USER_KEY, JSON.stringify(user)) },
  clear() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) },
}
