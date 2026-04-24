"use client"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, Filter, Calendar, CreditCard, ChevronRight, Fingerprint, History, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useGym } from '@/context/gym-context'
import { assignFingerprint, getUserHistory } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { User, HistorialEvent } from '@/types/gym'

type FilterType = 'all' | 'active' | 'inactive'

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [fingerprintDialog, setFingerprintDialog] = useState(false)
  const [historyDialog, setHistoryDialog] = useState(false)
  const [fingerId, setFingerId] = useState('')
  const [history, setHistory] = useState<HistorialEvent[]>([])
  const [loading, setLoading] = useState(false)
  const { users, setUsers } = useGym()
  const { toast } = useToast()

  const filteredUsers = useMemo(() => {
    let result = users

    // Apply status filter
    if (filter === 'active') {
      result = result.filter(u => u.activo)
    } else if (filter === 'inactive') {
      result = result.filter(u => !u.activo)
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter(u => 
        u.nombre.toLowerCase().includes(searchLower) ||
        u.dni.includes(search)
      )
    }

    return result
  }, [users, filter, search])

  const handleAssignFingerprint = async () => {
    if (!selectedUser || !fingerId.trim()) return

    setLoading(true)
    try {
      const response = await assignFingerprint(selectedUser.id, parseInt(fingerId))
      if (response.success && response.user) {
        const updatedUsers = users.map(u => 
          u.id === selectedUser.id ? response.user! : u
        )
        setUsers(updatedUsers)
        setSelectedUser(response.user)
        toast({
          title: "✅ Huella asignada",
          description: `ID ${fingerId} asignado a ${selectedUser.nombre}`,
        })
        setFingerprintDialog(false)
        setFingerId('')
      }
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo asignar la huella",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewHistory = async (user: User) => {
    setLoading(true)
    setHistoryDialog(true)
    try {
      const response = await getUserHistory(user.id)
      if (response.success && response.historial) {
        setHistory(response.historial)
      } else {
        setHistory([])
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo cargar el historial",
        variant: "destructive",
      })
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const filterButtons: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'Todos', count: users.length },
    { value: 'active', label: 'Activos', count: users.filter(u => u.activo).length },
    { value: 'inactive', label: 'Inactivos', count: users.filter(u => !u.activo).length },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-7 h-7" />
          Lista de Usuarios
        </h1>
        <p className="text-muted-foreground mt-1">
          {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="h-12 pl-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex gap-2">
          {filterButtons.map((btn) => (
            <motion.div key={btn.value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant={filter === btn.value ? 'default' : 'outline'}
                onClick={() => setFilter(btn.value)}
                className={`h-12 ${
                  filter === btn.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'border-border text-foreground hover:bg-secondary'
                }`}
              >
                <Filter className="w-4 h-4 mr-2 sm:hidden" />
                <span className="hidden sm:inline">{btn.label}</span>
                <span className="sm:hidden">{btn.value === 'all' ? 'Todos' : btn.value === 'active' ? 'Act' : 'Inact'}</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-background/20 text-xs">
                  {btn.count}
                </span>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              <Card 
                className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        user.activo 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {user.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{user.nombre}</h3>
                        <p className="text-sm text-muted-foreground">DNI: {user.dni}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        user.activo 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <motion.div
                        animate={{ rotate: selectedUser?.id === user.id ? 90 : 0 }}
                      >
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedUser?.id === user.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-border space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Plan</p>
                              <p className="font-medium text-foreground">
                                {user.plan === 'libre' ? 'Libre' : '12 Pases'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Vencimiento</p>
                              <p className="font-medium text-foreground flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(user.vencimiento).toLocaleDateString('es-AR')}
                              </p>
                            </div>
                            {user.plan === '12pases' && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Pases</p>
                                <p className="font-medium text-foreground flex items-center gap-1">
                                  <CreditCard className="w-4 h-4" />
                                  {user.pases_disponibles} disponibles
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Registrado</p>
                              <p className="font-medium text-foreground">
                                {new Date(user.created_at).toLocaleDateString('es-AR')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Huella Digital</p>
                              <p className="font-medium text-foreground flex items-center gap-1">
                                <Fingerprint className="w-4 h-4" />
                                {user.finger_id ? `ID ${user.finger_id}` : 'No asignada'}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user)
                                setFingerprintDialog(true)
                                setFingerId(user.finger_id?.toString() || '')
                              }}
                              className="flex items-center gap-2"
                            >
                              <Fingerprint className="w-4 h-4" />
                              {user.finger_id ? 'Cambiar Huella' : 'Asignar Huella'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user)
                                handleViewHistory(user)
                              }}
                              className="flex items-center gap-2"
                            >
                              <History className="w-4 h-4" />
                              Ver Historial
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredUsers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron usuarios</h3>
                <p className="text-muted-foreground">
                  {search ? 'Intenta con otro término de búsqueda' : 'No hay usuarios registrados'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Dialog: Asignar Huella */}
      <Dialog open={fingerprintDialog} onOpenChange={setFingerprintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Asignar Huella Digital
            </DialogTitle>
            <DialogDescription>
              {selectedUser && `Asigna un ID de huella para ${selectedUser.nombre}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ID de Huella (1-127)</label>
              <Input
                type="number"
                min="1"
                max="127"
                value={fingerId}
                onChange={(e) => setFingerId(e.target.value)}
                placeholder="Ej: 1"
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 Este ID debe ser único en el gimnasio
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFingerprintDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignFingerprint} disabled={!fingerId.trim() || loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver Historial */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de {selectedUser?.nombre}
            </DialogTitle>
            <DialogDescription>
              Registro completo de actividad del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay eventos registrados para este usuario</p>
              </div>
            ) : (
              history.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getEventBadgeColor(event.tipo_evento)}`}>
                          {getEventLabel(event.tipo_evento)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {event.fecha} a las {event.hora}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{event.descripcion}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoryDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getEventLabel(tipo: string): string {
  const labels: Record<string, string> = {
    'alta': '🆕 Alta',
    'ingreso': '🏋️ Ingreso',
    'vencimiento': '⏰ Vencimiento',
    'renovacion': '🔄 Renovación',
    'inactividad': '❌ Inactividad',
    'reactivacion': '✅ Reactivación',
    'modificacion': '✏️ Modificación',
    'asignacion_huella': '👆 Huella',
  }
  return labels[tipo] || tipo
}

function getEventBadgeColor(tipo: string): string {
  const colors: Record<string, string> = {
    'alta': 'bg-blue-500/10 text-blue-500',
    'ingreso': 'bg-green-500/10 text-green-500',
    'vencimiento': 'bg-orange-500/10 text-orange-500',
    'renovacion': 'bg-purple-500/10 text-purple-500',
    'inactividad': 'bg-red-500/10 text-red-500',
    'reactivacion': 'bg-emerald-500/10 text-emerald-500',
    'modificacion': 'bg-yellow-500/10 text-yellow-500',
    'asignacion_huella': 'bg-cyan-500/10 text-cyan-500',
  }
  return colors[tipo] || 'bg-gray-500/10 text-gray-500'
}
