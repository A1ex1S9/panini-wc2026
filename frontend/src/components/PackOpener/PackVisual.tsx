import { Mosaic } from '../branding/Mosaic'
import { Wc26Lockup, Wc26Stack, PaniniLogo } from '../branding/Wc26Logo'

// Foil sticker pack: silver crimped wrapper, colourful mosaic panel,
// stacked 26 + gold trophy lockup in the centre.
export function PackVisual({ className = '' }: { className?: string }) {
  return (
    <div className={`foil relative aspect-[4/5] overflow-hidden rounded-sm shadow-xl ring-1 ring-black/30 ${className}`}>
      {/* crimped seal edges */}
      <div className="absolute inset-x-0 top-0 z-20 h-[4%] bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.13)_0_3px,transparent_3px_7px)]" />
      <div className="absolute inset-x-0 bottom-0 z-20 h-[4%] bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.13)_0_3px,transparent_3px_7px)]" />
      <div className="absolute left-0 top-0 z-20 h-full w-[2%] bg-black/10" />
      <div className="absolute right-0 top-0 z-20 h-full w-[2%] bg-black/10" />

      {/* mosaic panel inset on the foil */}
      <div className="absolute inset-[7%] overflow-hidden rounded-sm">
        <Mosaic seed={11} cols={7} rows={9} />
        {/* centre lockup */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Wc26Lockup className="text-[1.1rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
        </div>
        {/* bottom badges */}
        <div className="absolute bottom-[3%] left-[4%] flex flex-col items-center">
          <span className="rounded-md bg-white px-[0.6em] py-[0.05em] font-display text-[0.8rem] font-black text-slate-900 shadow">
            5
          </span>
          <span className="mt-[2px] font-display text-[0.55rem] font-black uppercase tracking-wide text-white drop-shadow">
            Stickers
          </span>
        </div>
        <PaniniLogo className="absolute bottom-[3%] right-[4%] text-[0.7rem] rounded-sm" />
      </div>

      {/* foil sheen */}
      <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-tr from-white/0 via-white/30 to-white/0" />
    </div>
  )
}

// Dark navy card back with the tournament mark, pre-flip.
export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[4px] bg-panini-navy ring-1 ring-black/30 ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_60%)]" />
      <Wc26Stack className="text-6xl opacity-90" />
      <div className="absolute inset-x-0 bottom-2 text-center font-display text-[8px] font-black uppercase tracking-widest text-white/40">
        FIFA World Cup 2026™
      </div>
    </div>
  )
}
