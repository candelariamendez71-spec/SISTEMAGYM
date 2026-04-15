"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGym } from '@/context/gym-context'
import { useSound } from '@/hooks/use-sound'
import { createUser } from '@/lib/api'

type PlanType = 'libre' | '12pases'

export default function CreateUserPage() {
  const [nombre, setNombre] = useState('')
  const [dni, setDni] = useState('')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [plan, setPlan] = useState<PlanType>('libre')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const { gym, users, setUsers } = useGym()
  const { playSuccess, playError } = useSound()

  const formatArs = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const precioLibre = gym?.precio_libre ?? 0
  const precio12Pases = gym?.precio_12_pases ?? 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nombre.trim() || !dni.trim() || !fechaInicio) {
      setError('Complete todos los campos')
      playError()
      return
    }

    // Check if DNI already exists
    if (users.some(u => u.dni === dni)) {
      setError('Ya existe un usuario con ese DNI')
      playError()
      return
    }

    setLoading(true)
    setError('')

    try {
      if (!gym) {
        throw new Error('Gimnasio no encontrado')
      }

      const newUser = await createUser({
        nombre: nombre.trim(),
        dni: dni.trim(),
        plan,
        fecha_inicio: fechaInicio,
        gym_id: gym.gym_id,
      })

      setUsers([...users, newUser])
      playSuccess()
      setSuccess(true)
      
      // Reset form after delay
      setTimeout(() => {
        setNombre('')
        setDni('')
        setFechaInicio(new Date().toISOString().split('T')[0])
        setPlan('libre')
        setSuccess(false)
      }, 2000)
    } catch {
      setError('Error al crear usuario')
      playError()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <UserPlus className="w-7 h-7" />
          Crear Usuario
        </h1>
        <p className="text-muted-foreground mt-1">Registra un nuevo usuario en el sistema</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Datos del Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="w-10 h-10 text-primary" />
                </motion.div>
                <h3 className="text-xl font-bold text-foreground mb-2">¡Usuario Creado!</h3>
                <p className="text-muted-foreground">El usuario ha sido registrado exitosamente</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="nombre" className="text-sm font-medium text-foreground">
                    Nombre Completo
                  </label>
                  <Input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Juan Pérez"
                    className="h-12 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="dni" className="text-sm font-medium text-foreground">
                    DNI
                  </label>
                  <Input
                    id="dni"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="12345678"
                    className="h-12 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="fechaInicio" className="text-sm font-medium text-foreground">
                    Fecha de Inicio
                  </label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="h-12 bg-secondary/50 border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Tipo de Plan
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <button
                        type="button"
                        onClick={() => setPlan('libre')}
                        className={`w-full p-4 rounded-xl border-2 transition-all ${
                          plan === 'libre'
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-secondary/30 hover:border-primary/50'
                        }`}
                      >
                        <p className="font-semibold text-foreground">Plan Libre</p>
                        <p className="text-sm text-primary font-bold">{formatArs(precioLibre)}</p>
                      </button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <button
                        type="button"
                        onClick={() => setPlan('12pases')}
                        className={`w-full p-4 rounded-xl border-2 transition-all ${
                          plan === '12pases'
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-secondary/30 hover:border-primary/50'
                        }`}
                      >
                        <p className="font-semibold text-foreground">12 Pases</p>
                        <p className="text-sm text-primary font-bold">{formatArs(precio12Pases)}</p>
                      </button>
                    </motion.div>
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      />
                    ) : (
                      <>
                        <UserPlus className="mr-2 w-5 h-5" />
                        Crear Usuario
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
