"use client"

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Settings, Upload, Save, Check, Palette, Building } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useGym } from '@/context/gym-context'
import { useSound } from '@/hooks/use-sound'
import { updateGym } from '@/lib/api'

const colorPresets = [
  '#00FFC6', // Default turquoise
  '#FF6B6B', // Coral red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky blue
  '#96CEB4', // Sage green
  '#FFEAA7', // Soft yellow
  '#DDA0DD', // Plum
  '#FF8C00', // Dark orange
]

export default function SettingsPage() {
  const { gym, setGym } = useGym()
  const { playSuccess } = useSound()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [nombre, setNombre] = useState(gym?.nombre || '')
  const [color, setColor] = useState(gym?.color || '#00FFC6')
  const [logoPreview, setLogoPreview] = useState(gym?.logo || '/images/logo.png')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!gym) return

    setSaving(true)

    try {
      const response = await updateGym(gym.gym_id, {
        nombre: nombre.trim() || gym.nombre,
        color,
        logo: logoPreview,
      })

      if (response.success && response.gym) {
        setGym(response.gym)
        playSuccess()
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      // fallback to local save if backend is unavailable
      setGym({
        ...gym,
        nombre: nombre.trim() || gym.nombre,
        color,
        logo: logoPreview,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-7 h-7" />
          Configuración
        </h1>
        <p className="text-muted-foreground mt-1">Personaliza tu gimnasio</p>
      </div>

      {/* Gym Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Building className="w-5 h-5" />
              Perfil del Gimnasio
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configura el nombre y logo de tu gimnasio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-border bg-secondary/30 cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image
                  src={logoPreview}
                  alt="Logo del gimnasio"
                  fill
                  className="object-contain p-2"
                />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-foreground mb-1">Logo del Gimnasio</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Recomendado: PNG transparente, 200x200px
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-border text-foreground hover:bg-secondary"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Logo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Gym Name */}
            <div className="space-y-2">
              <label htmlFor="nombre" className="text-sm font-medium text-foreground">
                Nombre del Gimnasio
              </label>
              <Input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Mi Gimnasio"
                className="h-12 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Color Theme */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Palette className="w-5 h-5" />
              Color Principal
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Personaliza el color de tu marca
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Color Presets */}
            <div className="flex flex-wrap gap-3">
              {colorPresets.map((presetColor) => (
                <motion.button
                  key={presetColor}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setColor(presetColor)}
                  className={`w-12 h-12 rounded-xl transition-all ${
                    color === presetColor 
                      ? 'ring-2 ring-offset-2 ring-offset-background ring-white' 
                      : ''
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>

            {/* Custom Color */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl border-2 border-border"
                style={{ backgroundColor: color }}
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#00FFC6"
                className="h-12 flex-1 bg-secondary/50 border-border font-mono text-foreground placeholder:text-muted-foreground"
              />
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 p-1 rounded-xl cursor-pointer bg-transparent border-border"
              />
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/20">
              <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-black font-bold"
                  style={{ backgroundColor: color }}
                >
                  G
                </div>
                <span className="font-semibold" style={{ color }}>
                  {nombre || 'Mi Gimnasio'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 font-semibold text-lg transition-all duration-300"
          style={{ 
            backgroundColor: saved ? '#22c55e' : color,
            color: '#000000'
          }}
        >
          {saving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full"
            />
          ) : saved ? (
            <>
              <Check className="mr-2 w-5 h-5" />
              ¡Guardado!
            </>
          ) : (
            <>
              <Save className="mr-2 w-5 h-5" />
              Guardar Cambios
            </>
          )}
        </Button>
      </motion.div>
    </div>
  )
}
