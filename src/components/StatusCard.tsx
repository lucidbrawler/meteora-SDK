import React from 'react';
import BN from 'bn.js';

interface StatusCardProps {
  dlmmPool: any;
  activeBin: any;
  positionInfo: any;
  positionAddress: string;
  success: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({
  dlmmPool,
  activeBin,
  positionInfo,
  positionAddress,
  success,
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Full raw JSON copied to clipboard!');
    });
  };

  const copyFullJson = () => {
    const data = {
      pool: dlmmPool?.pubkey?.toString(),
      positionAddress,
      position: positionInfo,
    };
    copyToClipboard(JSON.stringify(data, (key, value) => 
      typeof value === 'bigint' ? value.toString() : 
      value instanceof BN ? value.toString() : value, 
    2));
  };

  // Safe conversion for BN, BigInt, string, number
  const bnToString = (value: any): string => {
    if (!value) return '0';
    if (value instanceof BN) return value.toString();
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    return '0';
  };

  const formatAmount = (value: any, decimals: number = 9) => {
    const num = parseFloat(bnToString(value));
    return (num / Math.pow(10, decimals)).toFixed(6);
  };

  // Token symbol mapper (add more mints as needed)
  const getTokenSymbol = (mintStr?: string): string => {
    if (!mintStr) return 'Token';
    const lower = mintStr.toLowerCase();
    if (lower.includes('so11111111111111111111111111111111111111112')) return 'SOL';
    if (lower.includes('epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v')) return 'USDC';
    if (lower.includes('usdt')) return 'USDT';
    return mintStr.slice(0, 6) + '...';
  };

  // Helper to safely extract mint string from various SDK object shapes
  const getMintString = (obj: any): string | undefined => {
    if (!obj) return undefined;
    if (typeof obj === 'string') return obj;
    if (obj.toString && typeof obj.toString === 'function') {
      const str = obj.toString();
      if (str && str !== '[object Object]') return str;
    }
    if (obj.publicKey) return getMintString(obj.publicKey);
    if (obj.toBase58 && typeof obj.toBase58 === 'function') return obj.toBase58();
    return undefined;
  };

  // Try to detect token mints from dlmmPool (covers different SDK versions)
  const getTokenXMint = () => {
    if (!dlmmPool) return undefined;
    return getMintString(dlmmPool.tokenX) ||
           getMintString(dlmmPool.tokenXMint) ||
           getMintString(dlmmPool.state?.tokenX) ||
           getMintString(dlmmPool.state?.tokenXMint) ||
           getMintString(dlmmPool.config?.tokenX) ||
           getMintString(dlmmPool.tokenXMint);
  };

  const getTokenYMint = () => {
    if (!dlmmPool) return undefined;
    return getMintString(dlmmPool.tokenY) ||
           getMintString(dlmmPool.tokenYMint) ||
           getMintString(dlmmPool.state?.tokenY) ||
           getMintString(dlmmPool.state?.tokenYMint) ||
           getMintString(dlmmPool.config?.tokenY) ||
           getMintString(dlmmPool.tokenYMint);
  };

  const isPositionInRange = positionInfo?.positionData && activeBin ? 
    BigInt(bnToString(activeBin.binId)) >= BigInt(bnToString(positionInfo.positionData.lowerBinId)) && 
    BigInt(bnToString(activeBin.binId)) <= BigInt(bnToString(positionInfo.positionData.upperBinId)) 
    : false;

 let tokenXSymbol = getTokenSymbol(getTokenXMint());
  let tokenYSymbol = getTokenSymbol(getTokenYMint());

  // Fallback for known SOL-USDC pool if detection fails
  if ((!tokenXSymbol || tokenXSymbol === 'Token') && dlmmPool?.pubkey?.toString() === 'BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y') {
    tokenXSymbol = 'SOL';
    tokenYSymbol = 'USDC';
  }

  // Debug log (open browser console F12 to see the pool structure)
  React.useEffect(() => {
    if (dlmmPool) {
      console.log('🔍 DLMM Pool keys:', Object.keys(dlmmPool));
      console.log('Token X mint detected:', getTokenXMint());
      console.log('Token Y mint detected:', getTokenYMint());
    }
  }, [dlmmPool]);

  if (!success || !dlmmPool) return null;

  return (
    <div className="dlmm-card mt-6 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-5 h-5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">
            DLMM Status
          </h3>
          <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80">Pool + Position Live</p>
        </div>

        {/* Pool Active Bin Badge */}
        {activeBin && (
          <div className="px-4 py-1.5 rounded-2xl text-sm font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 flex items-center gap-2">
            📍 Active Bin: {bnToString(activeBin.binId)}
          </div>
        )}

        {/* Position In Range / Out of Range Badge */}
        {activeBin && positionInfo?.positionData && (
          <div className={`px-4 py-1.5 rounded-2xl text-sm font-semibold flex items-center gap-2 ${
            (activeBin.binId >= positionInfo.positionData.lowerBinId && 
             activeBin.binId <= positionInfo.positionData.upperBinId)
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400'
          }`}>
            {(activeBin.binId >= positionInfo.positionData.lowerBinId && 
              activeBin.binId <= positionInfo.positionData.upperBinId)
              ? '✅ Position In Range'
              : '⚠️ Position Out of Range'}
          </div>
        )}
      </div>

      {/* Pool Section */}
      <div className="mb-8">
        <div className="text-xs font-medium tracking-widest text-emerald-600 dark:text-emerald-400 mb-3 uppercase">Pool Information</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-slate-500 dark:text-slate-400 text-xs">Pool Address</span>
            <span className="font-mono text-emerald-700 dark:text-emerald-300 break-all">
              {dlmmPool.pubkey.toString()}
            </span>
          </div>
          {activeBin && (
            <>
              <div>
                <span className="block text-slate-500 dark:text-slate-400 text-xs">Active Bin</span>
                <span className="font-mono font-semibold">
                  {bnToString(activeBin.binId)}
                </span>
              </div>
              <div>
                <span className="block text-slate-500 dark:text-slate-400 text-xs">Current Price</span>
                <span className="font-mono">{bnToString(activeBin.price)} {tokenYSymbol}/{tokenXSymbol}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Position Section */}
      {positionInfo && positionInfo.positionData && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-medium tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Position Information</div>
            <button
              onClick={copyFullJson}
              className="text-xs px-4 py-2 bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center gap-2 text-indigo-600 dark:text-indigo-400"
            >
              📋 Copy Full Raw JSON
            </button>
          </div>

          <div className="mb-6">
            <span className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Position Address</span>
            <span className="font-mono break-all text-indigo-700 dark:text-indigo-300">
              {positionAddress}
            </span>
          </div>

          {/* TOTAL AMOUNTS — now correctly labeled */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 mb-6 border border-indigo-100 dark:border-indigo-800">
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-3">YOUR POSITION TOTALS</div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-xs">Total {tokenXSymbol}</span>
                <div className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatAmount(positionInfo.positionData.totalXAmount, 9)} <span className="text-lg font-normal text-slate-400">{tokenXSymbol}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-xs">Total {tokenYSymbol}</span>
                <div className="text-3xl font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatAmount(positionInfo.positionData.totalYAmount, 6)} <span className="text-lg font-normal text-slate-400">{tokenYSymbol}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vital Details */}
          <div className="grid grid-cols-2 gap-y-5 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">Lower Bin ID</span>
              <span className="font-mono font-semibold block mt-1 text-lg">
                {bnToString(positionInfo.positionData.lowerBinId)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">Upper Bin ID</span>
              <span className="font-mono font-semibold block mt-1 text-lg">
                {bnToString(positionInfo.positionData.upperBinId)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">Lower Price (Bin {positionInfo.positionData.lowerBinId})</span>
              <span className="font-mono block mt-1">
                {parseFloat(positionInfo.positionData.positionBinData?.[0]?.pricePerToken || '0').toFixed(4)} USDC per SOL
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">Upper Price (Bin {positionInfo.positionData.upperBinId})</span>
              <span className="font-mono block mt-1">
                {parseFloat(positionInfo.positionData.positionBinData?.slice(-1)[0]?.pricePerToken || '0').toFixed(4)} USDC per SOL
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">Fee Owed {tokenXSymbol}</span>
              <span className="font-mono block mt-1">
                {formatAmount(positionInfo.positionData.feeX, tokenXSymbol === 'SOL' ? 9 : 6)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">Fee Owed {tokenYSymbol}</span>
              <span className="font-mono block mt-1">
                {formatAmount(positionInfo.positionData.feeY, tokenYSymbol === 'USDC' ? 6 : 9)}
              </span>
            </div>
          </div>
        </div>
      )}

      {!positionInfo && (
        <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-600 rounded-3xl">
          Click "Get Position" after connecting to see position details here
        </div>
      )}
    </div>
  );
};

export default StatusCard;
