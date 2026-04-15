"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Settings, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AnimatedLogo } from '@/components/animated-logo'
import { GlowText } from '@/components/animated-text'
import { useGym } from '@/context/gym-context'
import { useSound } from '@/hooks/use-sound'
import { checkAccess } from '@/lib/api'
import type { User } from '@/types/gym'

type AccessState = 'idle' | 'success' | 'error'

interface AccessResult {
  state: AccessState
  message: string
  userName?: string
  subMessage?: string
  remainingPasses?: number
}

export default function AccessPage() {
  const [dni, setDni] = useState('')
  const [accessResult, setAccessResult] = useState<AccessResult>({ state: 'idle', message: '' })
  const [loading, setLoading] = useState(false)
  const { gym, users, setUsers, isAuthenticated, logout } = useGym()
  const { playSuccess, playError } = useSound()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const resetState = useCallback(() => {
    setAccessResult({ state: 'idle', message: '' })
    setDni('')
  }, [])

  useEffect(() => {
    if (accessResult.state !== 'idle') {
      const timer = setTimeout(resetState, 4000)
      return () => clearTimeout(timer)
    }
  }, [accessResult.state, resetState])

  const handleAccess = async () => {
    if (!dni.trim() || !gym) return

    setLoading(true)
    try {
      const response = await checkAccess(dni, gym.gym_id)

      if (response.success && response.user) {
        const accessedUser = response.user
        playSuccess()

        const updatedUsers = users.map(u =>
          u.dni === dni ? { ...accessedUser } : u
        )
        setUsers(updatedUsers)

        setAccessResult({
          state: 'success',
          message: `Bienvenido, ${accessedUser.nombre}`,
          userName: accessedUser.nombre,
          subMessage: response.message,
          remainingPasses: response.pases_restantes,
        })
      } else {
        playError()
        setAccessResult({
          state: 'error',
          message: response.message,
        })
      }
    } catch {
      playError()
      setAccessResult({
        state: 'error',
        message: 'Error de conexión',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && dni.trim()) {
      handleAccess()
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!gym) return null

  const primaryColor = gym.color || '#00FFC6'

  return (
    <main 
      className="min-h-screen bg-background flex flex-col"
      style={{ '--gym-primary': primaryColor } as React.CSSProperties}
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <AnimatedLogo src={gym.logo || '/images/logo.png'} alt={gym.nombre} size={50} />
          <div>
            <h1 className="font-bold text-foreground text-lg">{gym.nombre}</h1>
            <p className="text-xs text-muted-foreground">Control de Acceso</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin')}
            className="border-border text-foreground hover:bg-secondary"
          >
            <Settings className="h-4 w-4 mr-1" />
            Admin
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            Salir
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl opacity-10"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        <AnimatePresence mode="wait">
          {accessResult.state === 'idle' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 w-full max-w-lg text-center"
            >
              <div className="mb-8 flex justify-center">
                <AnimatedLogo src={gym.logo || '/images/logo.png'} alt={gym.nombre} size={120} />
              </div>

              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
                <GlowText text={gym.nombre} className="text-primary" />
              </h2>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Ingresá tu DNI
              </p>

              <div className="relative mb-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handleKeyDown}
                  placeholder="DNI"
                  className="h-20 text-center text-3xl md:text-4xl font-bold bg-secondary/50 border-2 border-border focus:border-primary rounded-2xl tracking-widest text-foreground placeholder:text-muted-foreground"
                  maxLength={10}
                  autoFocus
                />
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleAccess}
                  disabled={!dni.trim() || loading}
                  className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg transition-all duration-300"
                  style={{ 
                    backgroundColor: primaryColor,
                    color: '#000000',
                    boxShadow: `0 10px 40px ${primaryColor}40`
                  }}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-3 border-black/30 border-t-black rounded-full"
                    />
                  ) : (
                    <>
                      INGRESAR
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          ) : accessResult.state === 'success' ? (
            <SuccessScreen 
              userName={accessResult.userName!} 
              subMessage={accessResult.subMessage!}
              remainingPasses={accessResult.remainingPasses}
              primaryColor={primaryColor}
            />
          ) : (
            <ErrorScreen message={accessResult.message} />
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

function SuccessScreen({ userName, subMessage, remainingPasses, primaryColor }: { userName: string; subMessage: string; remainingPasses?: number; primaryColor: string }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5, times: [0, 0.6, 1] }}
        className="mb-6"
      >
        <div 
          className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <CheckCircle 
            className="w-20 h-20 md:w-24 md:h-24" 
            style={{ color: primaryColor }}
          />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl md:text-5xl font-bold mb-4"
        style={{ color: primaryColor }}
      >
        ¡Bienvenido!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl md:text-3xl text-foreground font-semibold mb-2"
      >
        {userName}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg md:text-xl text-muted-foreground"
      >
        {subMessage}
      </motion.p>

      {remainingPasses !== undefined && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-base md:text-lg text-foreground font-semibold"
        >
          Clases restantes: {remainingPasses}
        </motion.p>
      )}

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 3.5 }}
        className="h-1 mt-8 rounded-full origin-left"
        style={{ backgroundColor: primaryColor }}
      />
    </motion.div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <motion.div
      key="error"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5, times: [0, 0.6, 1] }}
        className="mb-6"
      >
        <motion.div 
          className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-destructive/20 flex items-center justify-center mx-auto"
          animate={{ x: [-5, 5, -5, 5, 0] }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <XCircle className="w-20 h-20 md:w-24 md:h-24 text-destructive" />
        </motion.div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl md:text-5xl font-bold text-destructive mb-4"
      >
        Acceso Denegado
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl md:text-2xl text-foreground"
      >
        {message}
      </motion.p>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 3.5 }}
        className="h-1 bg-destructive mt-8 rounded-full origin-left"
      />
    </motion.div>
  )
}
