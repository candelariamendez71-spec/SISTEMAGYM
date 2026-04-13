import Image from 'next/image'

interface AnimatedLogoProps {
  src: string
  alt: string
  size?: number
  className?: string
}

export function AnimatedLogo({ src, alt, size = 120, className = '' }: AnimatedLogoProps) {
  return (
    <div className={className}>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  )
}
