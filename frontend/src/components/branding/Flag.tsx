// Country flag via flagcdn (supports gb-eng / gb-sct subdivision codes).
export function Flag({ code, className = '' }: { code: string; className?: string }) {
  if (!code) return null
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt={code}
      loading="eager"
      decoding="async"
      className={`object-cover rounded-[2px] shadow-sm ${className}`}
    />
  )
}
