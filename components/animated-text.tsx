"use client"

import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'

interface AnimatedTextProps {
  text: string
  className?: string
  delay?: number
}

export function AnimatedText({ text, className = '', delay = 0 }: AnimatedTextProps) {
  const letters = text.split('')

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: delay
      }
    }
  }

  const child: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200
      }
    }
  }

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={`inline-flex flex-wrap ${className}`}
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          variants={child}
          className={letter === ' ' ? 'w-2' : ''}
        >
          {letter}
        </motion.span>
      ))}
    </motion.span>
  )
}

export function GlowText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <motion.span
      className={`relative ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        className="absolute inset-0 blur-lg"
        animate={{ 
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ color: 'inherit' }}
      >
        {text}
      </motion.span>
      <span className="relative">{text}</span>
    </motion.span>
  )
}
