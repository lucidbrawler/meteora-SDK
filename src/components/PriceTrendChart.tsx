import React, { useState, useEffect } from 'react';

interface PriceTrendChartProps {
  poolAddress: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
}

interface OHLCVData {
  timestamp: number;
  timestamp_str: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const PriceTrendChart: React.FC<PriceTrendChartProps> = ({
  poolAddress,
  tokenXSymbol,
  tokenYSymbol,
}) => {
  const [timeframe, setTimeframe] = useState<'5m' | '15m' | '1h' | '4h' | '24h'>('1h');
  const [data, setData] = useState<OHLCVData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const timeframes = [
    { label: '5m', value: '5m' as const },
    { label: '15m', value: '15m' as const },
    { label: '1h', value: '1h' as const },
    { label: '4h', value: '4h' as const },
    { label: '24h', value: '24h' as const },
  ];

  const fetchOHLCV = async (tf: string) => {
    if (!poolAddress) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `https://dlmm.datapi.meteora.ag/pools/${poolAddress}/ohlcv?timeframe=${tf}`
      );

      if (!res.ok) throw new Error('Failed to fetch price data');

      const json = await res.json();
      setData(json.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load price trend. Please try again.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOHLCV(timeframe);
  }, [timeframe, poolAddress]);

  const renderChart = () => {
    if (!data.length) return null;

    const prices = data.map((d) => d.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const width = 600;
    const height = 220;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };

    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
      const y = padding.top + ((maxPrice - d.close) / priceRange) * (height - padding.top - padding.bottom);
      return { x, y, ...d };
    });

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    const lastPrice = data[data.length - 1]?.close || 0;
    const firstPrice = data[0]?.close || 0;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <span className="text-sm text-slate-500 dark:text-slate-400">Close Price</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {lastPrice.toFixed(4)}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{tokenYSymbol} / {tokenXSymbol}</span>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            change >= 0 
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
          }`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
          </div>
        </div>

        <svg 
          width="100%" 
          height={height} 
          viewBox={`0 0 ${width} ${height}`} 
          className="overflow-visible"
        >
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = padding.top + (i / 4) * (height - padding.top - padding.bottom);
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
                  className="text-[10px] fill-slate-400 dark:fill-slate-500"
                >
                  {(maxPrice - (i / 4) * priceRange).toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Price line */}
          <path 
            d={pathD} 
            fill="none" 
            stroke="#10b981" 
            strokeWidth="2.5" 
            strokeLinejoin="round" 
            strokeLinecap="round"
            className="drop-shadow-sm"
          />

          {/* Area under line */}
          <path 
            d={`${pathD} L ${points[points.length-1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`} 
            fill="url(#priceGradient)" 
            opacity="0.15"
          />

          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="3" 
                fill="#10b981" 
                className="hover:r-4 transition-all"
              />
              <title>{new Date(p.timestamp * 1000).toLocaleString()} — {p.close.toFixed(4)}</title>
            </g>
          ))}

          {/* X-axis labels */}
          {points.length > 0 && (
            <>
              <text 
                x={padding.left} 
                y={height - 8} 
                className="text-[10px] fill-slate-400 dark:fill-slate-500"
              >
                {new Date(points[0].timestamp * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </text>
              <text 
                x={width - padding.right} 
                y={height - 8} 
                textAnchor="end"
                className="text-[10px] fill-slate-400 dark:fill-slate-500"
              >
                {new Date(points[points.length - 1].timestamp * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </text>
            </>
          )}
        </svg>

        <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-1">
          Data from Meteora Data API • {timeframe} candles
        </div>
      </div>
    );
  };

  return (
    <div className="dlmm-card mt-6 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
            📈 Price Trend
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">OHLCV from Meteora Data API</p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-3 py-1 text-xs font-medium rounded-xl transition-all ${
                timeframe === tf.value
                  ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="h-[280px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner w-8 h-8 border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">Loading price history...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="h-[280px] flex items-center justify-center text-center">
          <div>
            <p className="text-red-500 mb-2">⚠️ {error}</p>
            <button 
              onClick={() => fetchOHLCV(timeframe)}
              className="text-xs px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && data.length > 0 && renderChart()}

      {!loading && !error && data.length === 0 && (
        <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
          No price data available for this pool
        </div>
      )}
    </div>
  );
};

export default PriceTrendChart;