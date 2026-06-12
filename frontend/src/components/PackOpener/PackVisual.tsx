import { GeoBackground } from '../branding/GeoBackground'
import { Wc26Logo, PaniniLogo } from '../branding/Wc26Logo'

// Replica of the official WC2026 foil sticker pack: silver sealed edges,
// colourful geometric body, big "26" + trophy in the centre.
export function PackVisual({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative aspect-[3/4] overflow-hidden rounded-md shadow-xl ring-1 ring-black/30 ${className}`}
    >
      <GeoBackground />
      {/* metallic sealed edges */}
      <div className="foil absolute inset-x-0 top-0 z-10 h-[9%] border-b border-black/10 [mask-image:linear-gradient(to_bottom,black_70%,black)]">
        <div className="h-full w-full bg-[repeating-linear-gradient(90deg,transparent_0,transparent_6px,rgba(0,0,0,0.07)_6px,rgba(0,0,0,0.07)_8px)]" />
      </div>
      <div className="foil absolute inset-x-0 bottom-0 z-10 h-[9%] border-t border-black/10">
        <div className="h-full w-full bg-[repeating-linear-gradient(90deg,transparent_0,transparent_6px,rgba(0,0,0,0.07)_6px,rgba(0,0,0,0.07)_8px)]" />
      </div>

      {/* centre lockup */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Wc26Logo className="text-[5.5rem] text-panini-navy drop-shadow" />
        <div className="mt-1 text-center font-display text-[0.65rem] font-black uppercase tracking-wider text-panini-navy">
          FIFA World Cup 2026™
        </div>
      </div>

      {/* bottom badges */}
      <div className="absolute bottom-[11%] left-2 z-10 rounded-sm bg-panini-navy px-1.5 py-0.5 font-display text-[0.6rem] font-black uppercase text-white">
        5 stickers
      </div>
      <div className="absolute bottom-[11%] right-2 z-10">
        <PaniniLogo className="text-[0.6rem]" />
      </div>

      {/* foil sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/25 to-white/0" />
    </div>
  )
}

// Dark blue card back with the WC26 watermark, shown before each flip.
export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-panini-navy ring-1 ring-black/30 ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
      <Wc26Logo className="text-6xl text-white/20" />
      <div className="absolute bottom-2 inset-x-0 text-center font-display text-[8px] font-black uppercase tracking-widest text-white/30">
        FIFA World Cup 2026™
      </div>
    </div>
  )
}
