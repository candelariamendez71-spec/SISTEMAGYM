export interface Gym {
  gym_id: string
  nombre: string
  color: string
  logo: string
  precio_libre: number
  precio_12_pases: number
}

export interface User {
  id: string
  nombre: string
  dni: string
  plan: 'libre' | '12pases'
  fecha_inicio: string
  vencimiento: string
  pases_disponibles: number
  gym_id: string
  activo: boolean
  created_at: string
}

export interface AccessResponse {
  success: boolean
  message: string
  user?: User
  pases_restantes?: number
}

export interface LoginResponse {
  success: boolean
  gym?: Gym
  token?: string
  message?: string
}
