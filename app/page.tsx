"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AnimatedLogo } from '@/components/animated-logo'
import { AnimatedText, GlowText } from '@/components/animated-text'
import { useGym } from '@/context/gym-context'
import { login } from '@/lib/api'

export default function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [pin, setPin] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { setGym, setUsers, setRole } = useGym()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario || !contraseña) {
      setError('Por favor complete todos los campos')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await login(usuario, contraseña, pin || undefined)
      if (response.success && response.gym) {
        setGym(response.gym)
        if (response.users) {
          setUsers(response.users)
        }
        // 🆕 Guardar rol (por defecto staff si no viene)
        setRole(response.role || 'staff')
        router.push('/access')
      } else {
        setError(response.message || 'Error al iniciar sesión')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <AnimatedLogo src="/images/logo.png" alt="CyberArgento" size={140} />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            <AnimatedText text="Sistema Gym" className="justify-center" />
          </h1>
          <p className="text-sm text-muted-foreground">
            by <GlowText text="CYBERARGENTO" className="text-primary font-semibold" />
          </p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6 md:p-8 shadow-2xl"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="usuario" className="text-sm font-medium text-foreground">
                Usuario
              </label>
              <Input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ingrese su usuario"
                className="h-12 bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="contraseña" className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="contraseña"
                  type={showPassword ? 'text' : 'password'}
                  value={contraseña}
                  onChange={(e) => setContraseña(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  className="h-12 bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 pr-12 text-foreground placeholder:text-muted-foreground"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* 🆕 Campo opcional de PIN para Owner */}
            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm font-medium text-foreground flex items-center gap-2">
                PIN de Administrador
                <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Solo para dueño"
                  className="h-12 bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 pr-12 text-foreground placeholder:text-muted-foreground"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ingresa tu PIN para acceder como dueño con permisos completos
              </p>
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

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg transition-all duration-300 shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  />
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Ingresar
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          © 2026 CyberArgento. Todos los derechos reservados.
        </motion.p>
      </motion.div>
    </main>
  )
}
