import type { Gym, User, AccessResponse, LoginResponse } from '@/types/gym'

const API_BASE_URL = ''

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  const data = await response.json().catch(() => ({ success: false, message: 'Error de conexión' }))

  if (!response.ok) {
    throw new Error((data as any).message || 'Error del servidor')
  }

  return data as T
}

export async function login(usuario: string, contraseña: string): Promise<LoginResponse & { users?: User[] }> {
  const data = await request<{ success: boolean; gym?: Gym; users?: User[]; message?: string }>('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password: contraseña }),
  })
  return data
}

export async function checkAccess(dni: string, gymId: string): Promise<AccessResponse> {
  const data = await request<AccessResponse>('/api/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, gym_id: gymId }),
  })
  return data
}

export async function getUser(dni: string, gymId: string): Promise<User | null> {
  const data = await request<{ success: boolean; user?: User }>('/api/user/' + encodeURIComponent(dni) + '/' + encodeURIComponent(gymId), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return data.user ?? null
}

export async function getUsers(gymId: string, estado?: 'activo' | 'inactivo') {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : ''
  const data = await request<{ success: boolean; total: number; users: User[] }>('/api/users/' + encodeURIComponent(gymId) + query, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return data
}

export async function createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
  const data = await request<{ success: boolean; user: User }>('/api/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  })
  return data.user
}

export async function renewPlan(dni: string, gymId: string, plan: 'libre' | '12pases'): Promise<{ success: boolean; user?: User }> {
  const data = await request<{ success: boolean; user?: User }>('/api/renew', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, gym_id: gymId, plan }),
  })
  return data
}

export async function updateGym(id: string, payload: { nombre: string; logo: string; color: string }) {
  const data = await request<{ success: boolean; gym?: Gym }>('/api/gym/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return data
}
