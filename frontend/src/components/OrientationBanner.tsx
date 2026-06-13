import { useEffect, useState } from 'react'

export function OrientationBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < 768
      const isPortrait = window.innerHeight > window.innerWidth
      setShow(isMobile && isPortrait)
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-panini-navy/95 text-white backdrop-blur-sm">
      <div className="text-6xl mb-4" style={{ animation: 'spin 2s linear infinite' }}>📱</div>
      <div className="text-5xl mb-6">↻</div>
      <p className="text-xl font-display font-black uppercase text-center px-8">
        Переверните телефон
      </p>
      <p className="mt-2 text-sm text-white/60 text-center px-12">
        Для наклейки стикеров в альбом нужна альбомная ориентация
      </p>
    </div>
  )
}
