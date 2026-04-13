"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, User, Calendar, CreditCard, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGym } from '@/context/gym-context'
import { useSound } from '@/hooks/use-sound'
import { getUser, renewPlan } from '@/lib/api'
import type { User as UserType } from '@/types/gym'

export default function AdminPanel() {
  const [searchDni, setSearchDni] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewLoading, setRenewLoading] = useState(false)
  const { gym, users, setUsers } = useGym()
  const { playSuccess, playError } = useSound()

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.activo).length
  const inactiveUsers = users.filter(u => !u.activo).length

  const handleSearch = async () => {
    if (!searchDni.trim() || !gym) return

    setLoading(true)
    try {
      const user = await getUser(searchDni, gym.gym_id)
      if (user) {
        setSelectedUser(user)
        playSuccess()
      } else {
        setSelectedUser(null)
        playError()
      }
    } catch {
      playError()
    } finally {
      setLoading(false)
    }
  }

  const handleRenew = async (plan: 'libre' | '12pases') => {
    if (!selectedUser) return
    
    setRenewLoading(true)
    try {
      if (!gym) throw new Error('Gimnasio no disponible')
      const response = await renewPlan(selectedUser.dni, gym.gym_id, plan)
      if (response.success) {
        const vencimiento = new Date()
        vencimiento.setMonth(vencimiento.getMonth() + 1)
        
        const updatedUsers = users.map(u => 
          u.dni === selectedUser.dni 
            ? { 
                ...u, 
                plan, 
                vencimiento: vencimiento.toISOString().split('T')[0],
                pases_disponibles: plan === '12pases' ? 12 : 0,
                activo: true
              }
            : u
        )
        setUsers(updatedUsers)
        setSelectedUser({
          ...selectedUser,
          plan,
          vencimiento: vencimiento.toISOString().split('T')[0],
          pases_disponibles: plan === '12pases' ? 12 : 0,
          activo: true
        })
        playSuccess()
        setShowRenewModal(false)
      }
    } catch {
      playError()
    } finally {
      setRenewLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Panel de Administración</h1>
        <p className="text-muted-foreground mt-1">{gym?.nombre}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
                  <p className="text-xs text-muted-foreground">Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{inactiveUsers}</p>
                  <p className="text-xs text-muted-foreground">Inactivos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Search className="w-5 h-5" />
            Buscar Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              placeholder="Ingrese DNI"
              className="h-12 flex-1 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleSearch}
                disabled={loading || !searchDni.trim()}
                className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  />
                ) : (
                  'Buscar'
                )}
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* User Info */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Información del Usuario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="font-semibold text-foreground">{selectedUser.nombre}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">DNI</p>
                  <p className="font-semibold text-foreground">{selectedUser.dni}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-semibold text-foreground">
                    {selectedUser.plan === 'libre' ? 'Libre' : '12 Pases'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Vencimiento</p>
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedUser.vencimiento).toLocaleDateString('es-AR')}
                  </p>
                </div>
                {selectedUser.plan === '12pases' && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Pases Disponibles</p>
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      {selectedUser.pases_disponibles}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedUser.activo 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {selectedUser.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button 
                  onClick={() => setShowRenewModal(true)}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <RefreshCw className="mr-2 w-5 h-5" />
                  Renovar Plan
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Renew Modal */}
      {showRenewModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowRenewModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-bold text-foreground mb-4">Renovar Plan</h3>
            <p className="text-muted-foreground mb-6">
              Seleccione el nuevo plan para {selectedUser?.nombre}
            </p>

            <div className="space-y-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => handleRenew('libre')}
                  disabled={renewLoading}
                  variant="outline"
                  className="w-full h-14 justify-between border-border text-foreground hover:bg-secondary hover:border-primary"
                >
                  <span>Plan Libre</span>
                  <span className="font-bold text-primary">$28.000</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => handleRenew('12pases')}
                  disabled={renewLoading}
                  variant="outline"
                  className="w-full h-14 justify-between border-border text-foreground hover:bg-secondary hover:border-primary"
                >
                  <span>Plan 12 Pases</span>
                  <span className="font-bold text-primary">$26.000</span>
                </Button>
              </motion.div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowRenewModal(false)}
              className="w-full mt-4 text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
