"use client"

import { useCallback } from 'react'

export function useSound() {
  const playSuccess = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      
      // Create a pleasant success sound (ascending tones)
      const oscillator1 = audioContext.createOscillator()
      const oscillator2 = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
      oscillator1.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
      
      oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
      oscillator2.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2) // G5
      
      oscillator1.type = 'sine'
      oscillator2.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
      
      oscillator1.start(audioContext.currentTime)
      oscillator2.start(audioContext.currentTime + 0.1)
      oscillator1.stop(audioContext.currentTime + 0.3)
      oscillator2.stop(audioContext.currentTime + 0.4)
    } catch {
      console.log('Audio not supported')
    }
  }, [])

  const playError = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      
      // Create an error sound (descending buzz)
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2)
      
      oscillator.type = 'square'
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch {
      console.log('Audio not supported')
    }
  }, [])

  return { playSuccess, playError }
}
