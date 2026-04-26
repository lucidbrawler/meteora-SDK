import React, { useState, useEffect } from 'react';
import DLMM from '@meteora-ag/dlmm';
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import StatusCard from './StatusCard';
import PriceChart from './PriceChart';
import PriceTrendChart from './PriceTrendChart';

const DLMMConnector: React.FC = () => {
  const [rpcUrl, setRpcUrl] = useState('https://solana-rpc.publicnode.com');
  const [poolAddress, setPoolAddress] = useState('BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y');
  const [dlmmPool, setDlmmPool] = useState<any>(null);
  const [activeBin, setActiveBin] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [positionAddress, setPositionAddress] = useState('HP2grHkQbcpFSdoFYpdsD2SEFMFinc37L1AYbbVDSUvU');
  const [positionInfo, setPositionInfo] = useState<any>(null);
  const [bins, setBins] = useState<any[]>([]);
  const [triggerPrice1, setTriggerPrice1] = useState(0.00705);
  const [triggerPrice2, setTriggerPrice2] = useState(0.00695);
  const [triggerMin, setTriggerMin] = useState(0.0065);
  const [triggerMax, setTriggerMax] = useState(0.0075);

  // Dynamic token symbols from SDK (used by all charts and status)
  const [tokenXSymbol, setTokenXSymbol] = useState('SOL');
  const [tokenYSymbol, setTokenYSymbol] = useState('USDC');

  const getNumericPrice = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (val && typeof val.toString === 'function') return parseFloat(val.toString()) || 0;
    return 0;
  };

  // Dynamic token detection (runs whenever dlmmPool changes)
  useEffect(() => {
    if (!dlmmPool) {
      setTokenXSymbol('SOL');
      setTokenYSymbol('USDC');
      return;
    }

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

    const getTokenSymbolLocal = (mintStr?: string): string => {
      if (!mintStr) return 'Token';
      const lower = mintStr.toLowerCase().trim();
      if (lower.includes('so11111111111111111111111111111111111111112')) return 'SOL';
      if (lower.includes('epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v')) return 'USDC';
      if (lower.includes('usdt')) return 'USDT';
      if (lower.startsWith('27g8mtk7vttctchk')) return 'JLP';   // ← ROBUST JLP fix (prefix match)
      return mintStr.slice(0, 6) + '...';
    };

    const tokenXMint = getMintString(dlmmPool.tokenX) ||
                       getMintString(dlmmPool.tokenXMint) ||
                       getMintString(dlmmPool.state?.tokenX) ||
                       getMintString(dlmmPool.state?.tokenXMint) ||
                       getMintString(dlmmPool.config?.tokenX) ||
                       getMintString(dlmmPool.tokenXMint);

    const tokenYMint = getMintString(dlmmPool.tokenY) ||
                       getMintString(dlmmPool.tokenYMint) ||
                       getMintString(dlmmPool.state?.tokenY) ||
                       getMintString(dlmmPool.state?.tokenYMint) ||
                       getMintString(dlmmPool.config?.tokenY) ||
                       getMintString(dlmmPool.tokenYMint);

    let xSym = getTokenSymbolLocal(tokenXMint);
    let ySym = getTokenSymbolLocal(tokenYMint);

    // Known fallback for default SOL-USDC pool
    if (dlmmPool?.pubkey?.toString() === 'BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y') {
      xSym = 'SOL';
      ySym = 'USDC';
    }

    setTokenXSymbol(xSym);
    setTokenYSymbol(ySym);
  }, [dlmmPool]);

  const initializeSDK = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setDlmmPool(null);
    setActiveBin(null);
    setPositionInfo(null);
    setBins([]);

    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const pubkey = new PublicKey(poolAddress);

      const pool = await DLMM.create(connection, pubkey);
      setDlmmPool(pool);

      const bin = await pool.getActiveBin();
      setActiveBin(bin);

      try {
        const binsData = await pool.getBinsAroundActiveBin(40, 40);
        setBins(binsData.bins || []);
      } catch (e) {
        console.warn('Could not fetch bins for chart:', e);
        setBins([]);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPositionInfo = async () => {
    if (!dlmmPool) {
      setError('Please connect to the DLMM pool first before fetching a position.');
      return;
    }

    setLoading(true);
    setError('');
    setPositionInfo(null);

    try {
      const posPubkey = new PublicKey(positionAddress);
      const position = await dlmmPool.getPosition(posPubkey);
      setPositionInfo(position);

      if (position?.positionData) {
        const lower = Number(position.positionData.lowerBinId);
        const upper = Number(position.positionData.upperBinId);
        const padding = 25;

        try {
          const binsData = await dlmmPool.getBinsBetweenLowerAndUpperBound(
            lower - padding,
            upper + padding
          );
          if (binsData?.bins?.length > 0) setBins(binsData.bins);
        } catch (e) {}
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch position info.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamically set trigger slider range + initial values
  useEffect(() => {
    if (!success || !activeBin) return;

    const currentPrice = getNumericPrice(activeBin.price || activeBin.pricePerToken);

    let minP = currentPrice * 0.9;
    let maxP = currentPrice * 1.1;

    if (bins.length > 0) {
      const prices = bins
        .map((b: any) => getNumericPrice(b.pricePerToken || b.price))
        .filter((p: number) => p > 0);
      if (prices.length > 0) {
        const chartMin = Math.min(...prices);
        const chartMax = Math.max(...prices);
        const pad = (chartMax - chartMin) * 0.18;
        minP = Math.max(0.000001, chartMin - pad);
        maxP = chartMax + pad;
      }
    }

    setTriggerMin(minP);
    setTriggerMax(maxP);

    if (positionInfo?.positionData?.positionBinData?.length > 0) {
      const binData = positionInfo.positionData.positionBinData;
      const lowerPrice = getNumericPrice(binData[0]?.pricePerToken);
      const upperPrice = getNumericPrice(binData[binData.length - 1]?.pricePerToken);

      if (lowerPrice > 0 && upperPrice > 0) {
        setTriggerPrice1(upperPrice);
        setTriggerPrice2(lowerPrice);
        return;
      }
    }

    if (currentPrice > 0) {
      setTriggerPrice1(currentPrice * 1.008);
      setTriggerPrice2(currentPrice * 0.992);
    }
  }, [success, activeBin, bins, positionInfo]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 py-10">
      <div className="max-w-[1480px] mx-auto px-8">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-5">
            <div className="dlmm-logo text-4xl w-16 h-16 flex items-center justify-center">🌊</div>
            <div>
              <h1 className="dlmm-title text-5xl">Meteora DLMM</h1>
              <p className="dlmm-subtitle text-xl">SDK Playground</p>
            </div>
          </div>
          <div className="live-pill text-lg px-6 py-3">
            <span className="live-dot"></span>
            LIVE ON SOLANA
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* LEFT COLUMN: Controls + StatusCard */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            {/* Controls */}
            <div className="dlmm-card">
              <div className="space-y-8">
                <div className="dlmm-input-group">
                  <label className="dlmm-label">RPC Endpoint</label>
                  <input
                    type="text"
                    value={rpcUrl}
                    onChange={(e) => setRpcUrl(e.target.value)}
                    className="dlmm-input"
                  />
                </div>

                <div className="dlmm-input-group">
                  <label className="dlmm-label">DLMM Pool Address</label>
                  <input
                    type="text"
                    value={poolAddress}
                    onChange={(e) => setPoolAddress(e.target.value)}
                    className="dlmm-input"
                  />
                </div>

                <div className="dlmm-input-group">
                  <label className="dlmm-label">Position Address</label>
                  <input
                    type="text"
                    value={positionAddress}
                    onChange={(e) => setPositionAddress(e.target.value)}
                    className="dlmm-input"
                  />
                </div>

                <div className="dlmm-buttons grid grid-cols-1 gap-3">
                  <button
                    onClick={initializeSDK}
                    disabled={loading || !poolAddress}
                    className="dlmm-button dlmm-button-primary text-lg py-6"
                  >
                    {loading ? (
                      <>
                        <div className="spinner" />
                        Connecting to Pool...
                      </>
                    ) : (
                      <>🔌 Connect to Pool</>
                    )}
                  </button>

                  <button
                    onClick={fetchPositionInfo}
                    disabled={loading || !dlmmPool || !positionAddress}
                    className="dlmm-button dlmm-button-secondary text-lg py-6"
                  >
                    {loading ? (
                      <>
                        <div className="spinner" />
                        Fetching...
                      </>
                    ) : (
                      <>📍 Get Position</>
                    )}
                  </button>
                </div>

                {error && <div className="dlmm-error mt-4">{error}</div>}
              </div>
            </div>

            {/* StatusCard */}
            <StatusCard
              dlmmPool={dlmmPool}
              activeBin={activeBin}
              positionInfo={positionInfo}
              positionAddress={positionAddress}
              success={success}
            />
          </div>

          {/* RIGHT COLUMN: Charts & Triggers */}
          <div className="col-span-12 lg:col-span-8 space-y-10">
            {success && (
              <PriceChart
                bins={bins}
                activeBin={activeBin}
                positionInfo={positionInfo}
                triggerPrice1={triggerPrice1}
                triggerPrice2={triggerPrice2}
                tokenXSymbol={tokenXSymbol}
                tokenYSymbol={tokenYSymbol}
              />
            )}

            {success && (
              <div className="dlmm-card">
                <div className="text-xs font-medium tracking-widest text-indigo-400 uppercase mb-6">TRIGGER CONTROLS</div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="dlmm-label flex items-center gap-2 mb-3">
                      Trigger 1 (Upper) <span className="text-amber-500 text-xl">⚡</span>
                    </label>
                    <input
                      type="range"
                      min={triggerMin}
                      max={triggerMax}
                      step="0.00001"
                      value={triggerPrice1}
                      onChange={(e) => setTriggerPrice1(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                      <span>{triggerMin.toFixed(5)}</span>
                      <span className="text-amber-400 font-semibold">{triggerPrice1.toFixed(5)}</span>
                      <span>{triggerMax.toFixed(5)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="dlmm-label flex items-center gap-2 mb-3">
                      Trigger 2 (Lower) <span className="text-violet-500 text-xl">🛑</span>
                    </label>
                    <input
                      type="range"
                      min={triggerMin}
                      max={triggerMax}
                      step="0.00001"
                      value={triggerPrice2}
                      onChange={(e) => setTriggerPrice2(parseFloat(e.target.value))}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                      <span>{triggerMin.toFixed(5)}</span>
                      <span className="text-violet-400 font-semibold">{triggerPrice2.toFixed(5)}</span>
                      <span>{triggerMax.toFixed(5)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-6 text-center">
                  Sliders are constrained to the visible price range on the chart
                </p>
              </div>
            )}

            {success && dlmmPool && (
              <PriceTrendChart
                poolAddress={poolAddress}
                tokenXSymbol={tokenXSymbol}
                tokenYSymbol={tokenYSymbol}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DLMMConnector;