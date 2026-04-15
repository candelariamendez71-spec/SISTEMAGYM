"use client"

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Plus,
  Filter,
  CreditCard,
  Wallet,
  Trash2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useGym } from '@/context/gym-context'
import { useSound } from '@/hooks/use-sound'
import { toast } from 'sonner'

interface Movimiento {
  id: number
  gym_id: number
  tipo: 'ingreso' | 'egreso'
  categoria: 'mensualidad' | 'clase_prueba' | 'producto' | 'gasto'
  descripcion: string
  monto: number
  metodo_pago: 'efectivo' | 'transferencia' | 'otro'
  fecha: string
  created_at: string
}

interface Resumen {
  ingresos: number
  egresos: number
  balance: number
  por_metodo: {
    efectivo: number
    transferencia: number
  }
}

export default function CajaPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [movimientoToDelete, setMovimientoToDelete] = useState<number | null>(null)
  const { gym } = useGym()
  const { playSuccess, playError } = useSound()

  // Form state
  const [formData, setFormData] = useState({
    tipo: 'ingreso' as 'ingreso' | 'egreso',
    categoria: 'mensualidad' as 'mensualidad' | 'clase_prueba' | 'producto' | 'gasto',
    descripcion: '',
    monto: '',
    metodo_pago: 'efectivo' as 'efectivo' | 'transferencia' | 'otro',
  })

  const formatArs = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const fetchMovimientos = async () => {
    if (!gym) return

    setLoading(true)
    try {
      const url = fechaFiltro 
        ? `/api/caja/${gym.gym_id}?fecha=${fechaFiltro}`
        : `/api/caja/${gym.gym_id}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setMovimientos(data.movimientos)
      }
    } catch (error) {
      console.error('Error fetching movimientos:', error)
      toast.error('Error al cargar movimientos')
    } finally {
      setLoading(false)
    }
  }

  const fetchResumen = async () => {
    if (!gym) return

    try {
      const response = await fetch(`/api/caja/${gym.gym_id}/resumen`)
      const data = await response.json()

      if (data.success) {
        setResumen(data)
      }
    } catch (error) {
      console.error('Error fetching resumen:', error)
    }
  }

  useEffect(() => {
    if (gym) {
      fetchMovimientos()
      fetchResumen()
    }
  }, [gym, fechaFiltro])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gym) {
      toast.error('No hay gimnasio seleccionado')
      return
    }

    const monto = parseFloat(formData.monto)
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser mayor a 0')
      playError()
      return
    }

    console.log('Enviando movimiento:', {
      gym_id: gym.gym_id,
      ...formData,
      monto,
    })

    try {
      const response = await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gym_id: gym.gym_id,
          ...formData,
          monto,
        }),
      })

      const data = await response.json()
      console.log('Respuesta del servidor:', data)

      if (data.success) {
        toast.success('Movimiento registrado')
        playSuccess()
        setFormData({
          tipo: 'ingreso',
          categoria: 'mensualidad',
          descripcion: '',
          monto: '',
          metodo_pago: 'efectivo',
        })
        setShowForm(false)
        fetchMovimientos()
        fetchResumen()
      } else {
        toast.error(data.message || 'Error al registrar movimiento')
        console.error('Error del servidor:', data.message)
        playError()
      }
    } catch (error) {
      console.error('Error creating movimiento:', error)
      toast.error('Error de conexión al registrar movimiento')
      playError()
    }
  }

  const handleDownloadPDF = async () => {
    if (!gym) return

    const now = new Date()
    const mes = now.getMonth() + 1
    const anio = now.getFullYear()

    try {
      const response = await fetch(
        `/api/caja/${gym.gym_id}/reporte-mensual?mes=${mes}&anio=${anio}`
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte-mensual-${mes}-${anio}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Reporte descargado')
        playSuccess()
      } else {
        toast.error('Error al generar reporte')
        playError()
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Error al descargar reporte')
      playError()
    }
  }

  const handleDelete = async (id: number) => {
    setMovimientoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!movimientoToDelete) return

    console.log('Eliminando movimiento ID:', movimientoToDelete)

    try {
      const response = await fetch(`/api/caja/${movimientoToDelete}`, {
        method: 'DELETE',
      })

      console.log('Respuesta del servidor:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error HTTP:', response.status, errorText)
        throw new Error(`Error HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('Datos de respuesta:', data)

      if (data.success) {
        toast.success('Movimiento eliminado')
        playSuccess()
        fetchMovimientos()
        fetchResumen()
        setDeleteDialogOpen(false)
        setMovimientoToDelete(null)
      } else {
        toast.error(data.message || 'Error al eliminar')
        console.error('Error del servidor:', data.message)
        playError()
      }
    } catch (error) {
      console.error('Error deleting movimiento:', error)
      toast.error('Error al eliminar movimiento: ' + (error instanceof Error ? error.message : 'Error desconocido'))
      playError()
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Caja</h1>
          <p className="text-muted-foreground">Gestión de ingresos y egresos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Reporte Mensual
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Resumen Cards */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  {formatArs(resumen.ingresos)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Egresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-2xl font-bold text-red-600">
                  {formatArs(resumen.egresos)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span className={`text-2xl font-bold ${resumen.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatArs(resumen.balance)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Por Método
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Efectivo:</span>
                <span className="font-semibold">{formatArs(resumen.por_metodo.efectivo)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Transferencia:</span>
                <span className="font-semibold">{formatArs(resumen.por_metodo.transferencia)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulario de Nuevo Movimiento */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Nuevo Movimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-black text-white [&>option]:bg-black [&>option]:text-white"
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                      >
                        <option value="ingreso">Ingreso</option>
                        <option value="egreso">Egreso</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-black text-white [&>option]:bg-black [&>option]:text-white"
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                      >
                        <option value="mensualidad">Mensualidad</option>
                        <option value="clase_prueba">Clase de Prueba</option>
                        <option value="producto">Producto</option>
                        <option value="gasto">Gasto</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Método de Pago</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-black text-white [&>option]:bg-black [&>option]:text-white"
                        value={formData.metodo_pago}
                        onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value as any })}
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        placeholder="Ej: Pago de mensualidad de Juan"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Monto (ARS)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.monto}
                        onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">Guardar Movimiento</Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Filtrar por fecha</Label>
              <Input
                type="date"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                className="mt-1"
              />
            </div>
            {fechaFiltro && (
              <Button
                variant="outline"
                onClick={() => setFechaFiltro('')}
                className="mt-6"
              >
                Limpiar Filtro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos ({movimientos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Fecha</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">Categoría</th>
                    <th className="text-left p-3">Descripción</th>
                    <th className="text-left p-3">Método</th>
                    <th className="text-right p-3">Monto</th>
                    <th className="text-right p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => (
                    <motion.tr
                      key={mov.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3 text-sm">{formatDate(mov.fecha)}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          mov.tipo === 'ingreso' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {mov.tipo === 'ingreso' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="p-3 text-sm capitalize">{mov.categoria.replace('_', ' ')}</td>
                      <td className="p-3 text-sm">{mov.descripcion}</td>
                      <td className="p-3 text-sm capitalize">
                        {mov.metodo_pago === 'efectivo' ? (
                          <Wallet className="w-4 h-4 inline mr-1" />
                        ) : (
                          <CreditCard className="w-4 h-4 inline mr-1" />
                        )}
                        {mov.metodo_pago}
                      </td>
                      <td className={`p-3 text-right font-semibold ${
                        mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatArs(mov.monto)}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(mov.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento será eliminado permanentemente
              y se actualizará el balance de caja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMovimientoToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
