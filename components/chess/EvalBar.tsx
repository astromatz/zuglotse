interface EvalBarProps {
  /** 0–100: white's advantage share. 50 = equal, 100 = full white advantage. */
  percent: number
  isAnalyzing: boolean
}

/**
 * Vertical evaluation bar shown beside the chess board.
 * White fills from the bottom, black from the top.
 */
export function EvalBar({ percent, isAnalyzing }: EvalBarProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent))

  return (
    <div
      className="flex flex-col w-3 self-stretch rounded-full overflow-hidden bg-gray-800 ring-1 ring-black/20 shadow-inner"
      style={{ minHeight: 180 }}
      role="meter"
      aria-label="Stellungsbewertung"
      aria-valuenow={Math.round(clampedPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Black portion on top */}
      <div
        className="transition-all duration-700 ease-in-out"
        style={{ flexBasis: `${100 - clampedPercent}%` }}
      />
      {/* White portion on bottom */}
      <div
        className={`bg-white rounded-b-full transition-all duration-700 ease-in-out ${isAnalyzing ? 'opacity-60' : 'opacity-100'}`}
        style={{ flexBasis: `${clampedPercent}%` }}
      />
    </div>
  )
}
