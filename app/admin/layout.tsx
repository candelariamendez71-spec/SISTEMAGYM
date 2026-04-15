"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Settings, 
  LogOut, 
  ScanLine,
  LayoutDashboard,
  Wallet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedLogo } from '@/components/animated-logo'
import { useGym } from '@/context/gym-context'

const navItems = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/create', label: 'Crear Usuario', icon: UserPlus },
  { href: '/admin/caja', label: 'Caja', icon: Wallet },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { gym, isAuthenticated, logout } = useGym()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!gym) return null

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <AnimatedLogo src={gym.logo || '/images/logo.png'} alt={gym.nombre} size={40} />
            <div className="min-w-0">
              <h1 className="font-bold text-foreground text-sm truncate">{gym.nombre}</h1>
              <p className="text-xs text-muted-foreground">Panel Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Link href="/access">
            <Button variant="outline" className="w-full justify-start border-border text-foreground hover:bg-secondary">
              <ScanLine className="mr-2 h-4 w-4" />
              Control Acceso
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <AnimatedLogo src={gym.logo || '/images/logo.png'} alt={gym.nombre} size={32} />
          <span className="font-bold text-foreground text-sm">{gym.nombre}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden flex items-center justify-around p-2 border-b border-border bg-card">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex flex-col items-center p-2 rounded-lg ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                <item.icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
              </div>
            </Link>
          )
        })}
        <Link href="/access">
          <div className="flex flex-col items-center p-2 rounded-lg text-muted-foreground">
            <ScanLine size={20} />
            <span className="text-xs mt-1">Acceso</span>
          </div>
        </Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 md:p-6 lg:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
