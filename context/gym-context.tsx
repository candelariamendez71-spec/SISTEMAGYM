"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Gym, User } from '@/types/gym'
import { getUsers } from '@/lib/api'

interface GymContextType {
  gym: Gym | null
  setGym: (gym: Gym | null) => void
  users: User[]
  setUsers: (users: User[]) => void
  isAuthenticated: boolean
  logout: () => void
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const bigint = parseInt(normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

function getContrastColor(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 160 ? '#000000' : '#ffffff'
}

const GymContext = createContext<GymContextType | undefined>(undefined)

const demoUsers: User[] = []

export function GymProvider({ children }: { children: ReactNode }) {
  const [gym, setGymState] = useState<Gym | null>(null)
  const [users, setUsersState] = useState<User[]>(demoUsers)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const applyGymColor = (color: string | null) => {
    const root = document.documentElement
    if (color) {
      root.style.setProperty('--primary', color)
      root.style.setProperty('--primary-foreground', getContrastColor(color))
      root.style.setProperty('--color-primary', color)
      root.style.setProperty('--color-primary-foreground', getContrastColor(color))
    } else {
      root.style.removeProperty('--primary')
      root.style.removeProperty('--primary-foreground')
      root.style.removeProperty('--color-primary')
      root.style.removeProperty('--color-primary-foreground')
    }
  }

  useEffect(() => {
    const loadSession = async () => {
      const savedGym = localStorage.getItem('gym')
      const savedUsers = localStorage.getItem('users')

      if (savedGym) {
        const parsedGym = JSON.parse(savedGym) as Gym
        setGymState(parsedGym)
        setIsAuthenticated(true)
        applyGymColor(parsedGym.color)

        try {
          const response = await getUsers(parsedGym.gym_id)
          if (response?.users) {
            setUsersState(response.users)
            localStorage.setItem('users', JSON.stringify(response.users))
            return
          }
        } catch {
          // Keep local users if backend is unavailable
        }
      }

      if (savedUsers) {
        setUsersState(JSON.parse(savedUsers))
      }
    }

    loadSession()
  }, [])

  const setGym = (newGym: Gym | null) => {
    setGymState(newGym)
    if (newGym) {
      localStorage.setItem('gym', JSON.stringify(newGym))
      setIsAuthenticated(true)
      applyGymColor(newGym.color)
    } else {
      localStorage.removeItem('gym')
      setIsAuthenticated(false)
      applyGymColor(null)
    }
  }

  const setUsers = (newUsers: User[]) => {
    setUsersState(newUsers)
    localStorage.setItem('users', JSON.stringify(newUsers))
  }

  const logout = () => {
    setGymState(null)
    localStorage.removeItem('gym')
    localStorage.removeItem('users')
    setUsersState([])
    setIsAuthenticated(false)
  }

  return (
    <GymContext.Provider value={{ gym, setGym, users, setUsers, isAuthenticated, logout }}>
      {children}
    </GymContext.Provider>
  )
}

export function useGym() {
  const context = useContext(GymContext)
  if (context === undefined) {
    throw new Error('useGym must be used within a GymProvider')
  }
  return context
}
