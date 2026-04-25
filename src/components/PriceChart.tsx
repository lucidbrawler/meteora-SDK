import React, { useMemo, useState } from 'react';

interface PriceChartProps {
  bins: any[];
  activeBin: any;
  positionInfo: any;
  triggerPrice1: number;
  triggerPrice2: number;
  tokenXSymbol?: string;
  tokenYSymbol?: string;
}

const PriceChart: React.FC<PriceChartProps> = ({
  bins,
  activeBin,
  positionInfo,
  triggerPrice1,
  triggerPrice2,
  tokenXSymbol = 'SOL',
  tokenYSymbol = 'USDC',
}) => {
  const [hoveredBin, setHoveredBin] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Safe number converter
  const toNum = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (val.toString) return parseFloat(val.toString()) || 0;
    return 0;
  };

  const sortedBins = useMemo(() => {
    if (!bins || bins.length === 0) return [];
    return [...bins]
      .map(b => ({
        binId: toNum(b.binId),
        price: toNum(b.pricePerToken || b.price || '0'),
      }))
      .filter(b => b.price > 0)
      .sort((a, b) => a.binId - b.binId);
  }, [bins]);

  if (sortedBins.length === 0) {
    return (
      <div className="dlmm-card mt-6 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="text-center py-12 text-slate-400">
          Connect to pool to load price chart data
        </div>
      </div>
    );
  }

  const minBin = Math.min(...sortedBins.map(b => b.binId));
  const maxBin = Math.max(...sortedBins.map(b => b.binId));
  const prices = sortedBins.map(b => b.price);
  const minPrice = Math.min(...prices) * 0.92;
  const maxPrice = Math.max(...prices) * 1.08;

  const width = 620;
  const height = 320;
  const padding = { left: 70, right: 20, top: 20, bottom: 50 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (binId: number) => 
    padding.left + ((binId - minBin) / Math.max(1, maxBin - minBin)) * chartWidth;

  const yScale = (price: number) => 
    padding.top + chartHeight - ((price - minPrice) / Math.max(0.0001, maxPrice - minPrice)) * chartHeight;

  // Line path
  const linePath = sortedBins
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${xScale(b.binId)} ${yScale(b.price)}`)
    .join(' ');

  // Active bin
  const activeBinId = toNum(activeBin?.binId);
  const activePrice = toNum(activeBin?.price || activeBin?.pricePerToken);
  const activeX = xScale(activeBinId);
  const activeY = yScale(activePrice);

  // Position boundaries
  const posLowerBin = positionInfo?.positionData ? toNum(positionInfo.positionData.lowerBinId) : null;
  const posUpperBin = positionInfo?.positionData ? toNum(positionInfo.positionData.upperBinId) : null;

  // Trigger Y positions
  const trigger1Y = yScale(triggerPrice1);
  const trigger2Y = yScale(triggerPrice2);

  // Handle mouse move for hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setMousePos({ x: mouseX, y: mouseY });

    // Find closest bin
    let closest = sortedBins[0];
    let minDist = Infinity;
    sortedBins.forEach(b => {
      const bx = xScale(b.binId);
      const dist = Math.abs(bx - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = b;
      }
    });

    if (minDist < 30) { // within 30px
      setHoveredBin(closest);
    } else {
      setHoveredBin(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredBin(null);
  };

  return (
    <div className="dlmm-card mt-6 border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-medium tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">PRICE CHART</div>
          <div className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">Position Range &amp; Triggers</div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {minBin} → {maxBin} bins • {sortedBins.length} points
        </div>
      </div>

      <div className="relative">
        <svg 
          width="100%" 
          height={height} 
          viewBox={`0 0 ${width} ${height}`}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-900 overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padding.top + p * chartHeight;
            return (
              <g key={i}>
                <line 
                  x1={padding.left} 
                  y1={y} 
                  x2={width - padding.right} 
                  y2={y} 
                  stroke="#e2e8f0" 
                  strokeDasharray="2,2" 
                  className="dark:stroke-slate-700"
                />
                <text 
                  x={padding.left - 8} 
                  y={y + 4} 
                  textAnchor="end" 
                  className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                >
                  {(minPrice + (maxPrice - minPrice) * (1 - p)).toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {[minBin, Math.floor((minBin + maxBin) / 2), maxBin].map((bin, i) => (
            <text 
              key={i}
              x={xScale(bin)} 
              y={height - 12} 
              textAnchor="middle" 
              className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
            >
              {bin}
            </text>
          ))}

          {/* Position Range Shade */}
          {posLowerBin !== null && posUpperBin !== null && (
            <rect
              x={xScale(Math.max(minBin, posLowerBin))}
              y={padding.top}
              width={Math.max(2, xScale(Math.min(maxBin, posUpperBin)) - xScale(Math.max(minBin, posLowerBin)))}
              height={chartHeight}
              fill="#10b981"
              fillOpacity={0.12}
              stroke="#10b981"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          )}

          {/* Soft gradient area fill under price line (makes it look curvier & premium) */}
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path 
            d={`${linePath} L ${xScale(sortedBins[sortedBins.length-1].binId)} ${padding.top + chartHeight} L ${xScale(sortedBins[0].binId)} ${padding.top + chartHeight} Z`}
            fill="url(#priceGradient)"
          />

          {/* Price Line - smoother & slightly thicker */}
          <path 
            d={linePath} 
            fill="none" 
            stroke="#6366f1" 
            strokeWidth={3} 
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {sortedBins.map((b, i) => (
            <circle 
              key={i}
              cx={xScale(b.binId)} 
              cy={yScale(b.price)} 
              r={2.5} 
              fill="#6366f1" 
              className="dark:fill-indigo-400"
            />
          ))}

          {/* Active Bin Vertical Line + Marker */}
          {activeBin && (
            <>
              <line 
                x1={activeX} 
                y1={padding.top} 
                x2={activeX} 
                y2={height - padding.bottom} 
                stroke="#ef4444" 
                strokeWidth={2} 
                strokeDasharray="4,2"
              />
              <circle 
                cx={activeX} 
                cy={activeY} 
                r={6} 
                fill="#ef4444" 
                stroke="#fff" 
                strokeWidth={2}
              />
              <text 
                x={activeX} 
                y={padding.top - 6} 
                textAnchor="middle" 
                className="text-[11px] font-semibold fill-red-600 dark:fill-red-400"
              >
                ACTIVE {activeBinId}
              </text>
            </>
          )}

          {/* Position Lower Boundary */}
          {posLowerBin !== null && (
            <line 
              x1={xScale(posLowerBin)} 
              y1={padding.top} 
              x2={xScale(posLowerBin)} 
              y2={height - padding.bottom} 
              stroke="#10b981" 
              strokeWidth={2} 
              strokeDasharray="6,3"
            />
          )}

          {/* Position Upper Boundary */}
          {posUpperBin !== null && (
            <line 
              x1={xScale(posUpperBin)} 
              y1={padding.top} 
              x2={xScale(posUpperBin)} 
              y2={height - padding.bottom} 
              stroke="#10b981" 
              strokeWidth={2} 
              strokeDasharray="6,3"
            />
          )}

          {/* Trigger 1 Horizontal Line */}
          <line 
            x1={padding.left} 
            y1={trigger1Y} 
            x2={width - padding.right} 
            y2={trigger1Y} 
            stroke="#f59e0b" 
            strokeWidth={2.5} 
            strokeDasharray="8,4"
          />
          <circle cx={padding.left + 12} cy={trigger1Y} r={4} fill="#f59e0b" />
          <text 
            x={width - padding.right - 8} 
            y={trigger1Y - 6} 
            textAnchor="end" 
            className="text-[11px] font-semibold fill-amber-600 dark:fill-amber-400"
          >
            TRIGGER 1: {triggerPrice1.toFixed(2)}
          </text>

          {/* Trigger 2 Horizontal Line */}
          <line 
            x1={padding.left} 
            y1={trigger2Y} 
            x2={width - padding.right} 
            y2={trigger2Y} 
            stroke="#8b5cf6" 
            strokeWidth={2.5} 
            strokeDasharray="8,4"
          />
          <circle cx={padding.left + 12} cy={trigger2Y} r={4} fill="#8b5cf6" />
          <text 
            x={width - padding.right - 8} 
            y={trigger2Y + 16} 
            textAnchor="end" 
            className="text-[11px] font-semibold fill-violet-600 dark:fill-violet-400"
          >
            TRIGGER 2: {triggerPrice2.toFixed(2)}
          </text>

          {/* Current Price Label */}
          {activePrice > 0 && (
            <text 
              x={activeX + 10} 
              y={activeY - 10} 
              className="text-[10px] font-mono fill-red-600 dark:fill-red-400"
            >
              {activePrice.toFixed(4)} {tokenYSymbol}/{tokenXSymbol}
            </text>
          )}

          {/* Hover Tooltip */}
          {hoveredBin && (
            <g>
              <rect 
                x={mousePos.x + 12} 
                y={mousePos.y - 30} 
                width={140} 
                height={38} 
                rx={6} 
                fill="#1e2937" 
                className="dark:fill-slate-800"
                stroke="#475569"
              />
              <text 
                x={mousePos.x + 20} 
                y={mousePos.y - 14} 
                className="text-[11px] fill-white font-mono"
              >
                Bin {hoveredBin.binId}
              </text>
              <text 
                x={mousePos.x + 20} 
                y={mousePos.y + 2} 
                className="text-[11px] fill-emerald-400 font-mono"
              >
                {hoveredBin.price.toFixed(4)} {tokenYSymbol}
              </text>
            </g>
          )}

          {/* Axis labels */}
          <text 
            x={padding.left - 50} 
            y={padding.top + chartHeight / 2} 
            transform={`rotate(-90, ${padding.left - 50}, ${padding.top + chartHeight / 2})`}
            textAnchor="middle"
            className="text-[10px] fill-slate-500 dark:fill-slate-400 tracking-widest"
          >
            PRICE ({tokenYSymbol} / {tokenXSymbol})
          </text>
          <text 
            x={width / 2} 
            y={height - 4} 
            textAnchor="middle" 
            className="text-[10px] fill-slate-500 dark:fill-slate-400 tracking-widest"
          >
            BIN ID
          </text>
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-indigo-500" />
            <span className="text-slate-600 dark:text-slate-400">Price Curve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-red-500" style={{ borderStyle: 'dashed' }} />
            <span className="text-slate-600 dark:text-slate-400">Active Bin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-emerald-500/20 border border-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Position Range</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-500" style={{ borderStyle: 'dashed' }} />
            <span className="text-slate-600 dark:text-slate-400">Trigger 1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-violet-500" style={{ borderStyle: 'dashed' }} />
            <span className="text-slate-600 dark:text-slate-400">Trigger 2</span>
          </div>
        </div>
      </div>

      <div className="mt-4 text-[10px] text-center text-slate-400 dark:text-slate-500">
        Hover over the chart to inspect bin prices • Adjust Trigger inputs above to move the dashed lines
      </div>
    </div>
  );
};

export default PriceChart;