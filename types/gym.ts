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
  finger_id?: number | null
}

export interface HistorialEvent {
  id: number
  user_id: number
  gym_id: number
  tipo_evento: 'alta' | 'ingreso' | 'vencimiento' | 'renovacion' | 'inactividad' | 'reactivacion' | 'modificacion' | 'asignacion_huella'
  descripcion: string
  fecha: string
  hora: string
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
