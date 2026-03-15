// ─── Authentication Store ──────────────────────────────────
// Persistent session with user-scoped data isolation

export interface AuthUser {
  id: string
  email: string
  name: string
  createdAt: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
}

const AUTH_KEY = "fakturator_auth"
let state: AuthState = { user: null, isAuthenticated: false }

type Listener = () => void
const listeners = new Set<Listener>()
function notify() { listeners.forEach((l) => l()) }

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAuthState(): AuthState { return state }
export function getAuthUser(): AuthUser | null { return state.user }
export function isAuthenticated(): boolean { return state.isAuthenticated }

// ─── User-Scoped Storage Key ──────────────────────────────
export function getUserStorageKey(): string {
  if (!state.user) return "fakturator_data_guest"
  return `fakturator_data_${state.user.id}`
}

// ─── Load Session ─────────────────────────────────────────
export function loadAuth(): void {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.user?.id && parsed?.user?.email) {
        state = { user: parsed.user, isAuthenticated: true }
      }
    }
  } catch {
    try { localStorage.removeItem(AUTH_KEY) } catch {}
  }
  notify()
}

// ─── Login ────────────────────────────────────────────────
export function login(email: string, password: string, name?: string): { success: boolean; error?: string } {
  if (!email?.trim()) return { success: false, error: "Email is required" }
  if (!password?.trim()) return { success: false, error: "Password is required" }
  if (password.length < 4) return { success: false, error: "Password must be at least 4 characters" }

  // Check if user already exists (registered previously)
  const usersKey = "fakturator_users"
  let users: Record<string, { id: string; email: string; name: string; passwordHash: string; createdAt: string }> = {}
  try {
    const raw = localStorage.getItem(usersKey)
    if (raw) users = JSON.parse(raw)
  } catch {}

  const normalizedEmail = email.trim().toLowerCase()
  let user = Object.values(users).find((u) => u.email === normalizedEmail)

  if (user) {
    // Existing user — verify password (simple hash comparison)
    if (user.passwordHash !== simpleHash(password)) {
      return { success: false, error: "Invalid email or password" }
    }
  } else {
    // New user — auto-register
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    user = {
      id,
      email: normalizedEmail,
      name: name || normalizedEmail.split("@")[0],
      passwordHash: simpleHash(password),
      createdAt: new Date().toISOString(),
    }
    users[id] = user
    try { localStorage.setItem(usersKey, JSON.stringify(users)) } catch {}
  }

  state = {
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    isAuthenticated: true,
  }

  try { localStorage.setItem(AUTH_KEY, JSON.stringify({ user: state.user })) } catch {}
  notify()
  return { success: true }
}

// ─── Logout ───────────────────────────────────────────────
export function logout(): void {
  state = { user: null, isAuthenticated: false }
  try { localStorage.removeItem(AUTH_KEY) } catch {}
  notify()
}

// ─── Simple Hash (not cryptographic — for demo auth) ──────
function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return `h_${Math.abs(hash).toString(36)}`
}

// ─── Secure Token Storage (per-user) ──────────────────────
// Tokens are base64-encoded and stored under user-specific keys

export function saveSecureToken(key: string, value: string): void {
  if (!state.user) return
  const storageKey = `fakturator_secure_${state.user.id}_${key}`
  try {
    const encoded = btoa(unescape(encodeURIComponent(value)))
    localStorage.setItem(storageKey, encoded)
  } catch {}
}

export function loadSecureToken(key: string): string | null {
  if (!state.user) return null
  const storageKey = `fakturator_secure_${state.user.id}_${key}`
  try {
    const encoded = localStorage.getItem(storageKey)
    if (encoded) return decodeURIComponent(escape(atob(encoded)))
  } catch {}
  return null
}

export function clearSecureToken(key: string): void {
  if (!state.user) return
  const storageKey = `fakturator_secure_${state.user.id}_${key}`
  try { localStorage.removeItem(storageKey) } catch {}
}
