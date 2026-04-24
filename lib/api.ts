import type { Gym, User, AccessResponse, LoginResponse, HistorialEvent } from '@/types/gym'

const API_BASE_URL = ''

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  const text = await response.text()
  let data: any

  try {
    data = JSON.parse(text)
  } catch {
    data = { success: false, message: text || 'Error de conexión' }
  }

  if (!response.ok) {
    const message = data?.message || 'Error del servidor'
    throw new Error(message)
  }

  return data as T
}

export async function login(usuario: string, contraseña: string, pin?: string): Promise<LoginResponse & { users?: User[]; role?: 'owner' | 'staff' }> {
  const body: any = { usuario, password: contraseña }
  if (pin) {
    body.pin = pin
  }
  
  const data = await request<{ success: boolean; gym?: Gym; users?: User[]; role?: 'owner' | 'staff'; message?: string }>('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

export async function createUser(userData: { nombre: string; dni: string; plan: 'libre' | '12pases'; fecha_inicio: string; gym_id: string }): Promise<User> {
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

export async function getGymPrices(gymId: string) {
  const data = await request<{ success: boolean; prices?: { precio_libre: number; precio_12_pases: number } }>(
    '/api/gym/' + encodeURIComponent(gymId) + '/prices',
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  )

  return data
}

export async function updateGymPrices(gymId: string, payload: { precio_libre: number; precio_12_pases: number }) {
  const data = await request<{ success: boolean; prices?: { precio_libre: number; precio_12_pases: number }; gym?: Gym }>(
    '/api/gym/' + encodeURIComponent(gymId) + '/prices',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  return data
}

// 🆕 FUNCIONES PARA HUELLAS DIGITALES
export async function assignFingerprint(userId: string, fingerId: number): Promise<{ success: boolean; user?: User; message?: string }> {
  const data = await request<{ success: boolean; user?: User; message?: string }>(
    '/api/user/' + encodeURIComponent(userId) + '/fingerprint',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finger_id: fingerId }),
    }
  )
  return data
}

export async function checkAccessByFingerprint(fingerId: number, gymId: string): Promise<AccessResponse> {
  const data = await request<AccessResponse>('/api/access/fingerprint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ finger_id: fingerId, gym_id: gymId }),
  })
  return data
}

// 🆕 FUNCIÓN PARA HISTORIAL
export async function getUserHistory(userId: string): Promise<{ success: boolean; historial?: HistorialEvent[]; message?: string }> {
  const data = await request<{ success: boolean; historial?: HistorialEvent[]; message?: string }>(
    '/api/user/' + encodeURIComponent(userId) + '/historial',
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  )
  return data
}
