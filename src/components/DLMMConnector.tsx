import React, { useState, useEffect } from 'react';
import DLMM from '@meteora-ag/dlmm';
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import StatusCard from './StatusCard';
import PriceChart from './PriceChart';

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

  const getNumericPrice = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (val && typeof val.toString === 'function') return parseFloat(val.toString()) || 0;
    return 0;
  };

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
  // Slider range is ALWAYS kept within the chart's visible price range
  useEffect(() => {
    if (!success || !activeBin) return;

    const currentPrice = getNumericPrice(activeBin.price || activeBin.pricePerToken);

    // Calculate slider range strictly from the visible chart bins (with comfortable padding)
    let minP = currentPrice * 0.9;
    let maxP = currentPrice * 1.1;

    if (bins.length > 0) {
      const prices = bins
        .map((b: any) => getNumericPrice(b.pricePerToken || b.price))
        .filter((p: number) => p > 0);
      if (prices.length > 0) {
        const chartMin = Math.min(...prices);
        const chartMax = Math.max(...prices);
        const pad = (chartMax - chartMin) * 0.18;   // 18% padding - keeps everything in view
        minP = Math.max(0.000001, chartMin - pad);
        maxP = chartMax + pad;
      }
    }

    setTriggerMin(minP);
    setTriggerMax(maxP);

    // Set the actual trigger line values (can be inside or at the edges of the chart)
    if (positionInfo?.positionData?.positionBinData?.length > 0) {
      const binData = positionInfo.positionData.positionBinData;
      const lowerPrice = getNumericPrice(binData[0]?.pricePerToken);
      const upperPrice = getNumericPrice(binData[binData.length - 1]?.pricePerToken);

      if (lowerPrice > 0 && upperPrice > 0) {
        // Place triggers at the position's actual lower/upper prices
        // (these are guaranteed to be inside the chart range)
        setTriggerPrice1(upperPrice);
        setTriggerPrice2(lowerPrice);
        return;
      }
    }

    // Fallback when no position is loaded yet
    if (currentPrice > 0) {
      setTriggerPrice1(currentPrice * 1.008);
      setTriggerPrice2(currentPrice * 0.992);
    }
  }, [success, activeBin, bins, positionInfo]);

  return (
    <div className="dlmm-container">
      <div className="dlmm-header">
        <div className="flex items-center gap-4">
          <div className="dlmm-logo">🌊</div>
          <div>
            <h2 className="dlmm-title">Meteora DLMM</h2>
            <p className="dlmm-subtitle">SDK Playground • Clean CSS Edition</p>
          </div>
        </div>
        <div className="live-pill">
          <span className="live-dot"></span>
          LIVE ON SOLANA
        </div>
      </div>

      <div className="dlmm-input-group">
        <label className="dlmm-label">RPC Endpoint</label>
        <input type="text" value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} className="dlmm-input" />
      </div>

      <div className="dlmm-input-group">
        <label className="dlmm-label">DLMM Pool Address</label>
        <input type="text" value={poolAddress} onChange={(e) => setPoolAddress(e.target.value)} className="dlmm-input" />
      </div>

      <div className="dlmm-input-group">
        <label className="dlmm-label">Position Address</label>
        <input type="text" value={positionAddress} onChange={(e) => setPositionAddress(e.target.value)} className="dlmm-input" />
      </div>

      {/* Action Buttons */}
      <div className="dlmm-buttons">
        <button
          onClick={initializeSDK}
          disabled={loading || !poolAddress}
          className="dlmm-button dlmm-button-primary"
        >
          {loading ? <><div className="spinner" />Connecting...</> : <>Connect to Pool</>}
        </button>

        <button
          onClick={fetchPositionInfo}
          disabled={loading || !dlmmPool || !positionAddress}
          className="dlmm-button dlmm-button-secondary"
        >
          {loading ? <><div className="spinner" />Fetching...</> : <>Get Position</>}
        </button>
      </div>

      {error && <div className="dlmm-error">⚠️ {error}</div>}

      <StatusCard
        dlmmPool={dlmmPool}
        activeBin={activeBin}
        positionInfo={positionInfo}
        positionAddress={positionAddress}
        success={success}
      />

      {/* Price Chart */}
      {success && (
        <PriceChart
          bins={bins}
          activeBin={activeBin}
          positionInfo={positionInfo}
          triggerPrice1={triggerPrice1}
          triggerPrice2={triggerPrice2}
          tokenXSymbol="SOL"
          tokenYSymbol="USDC"
        />
      )}

      {/* Trigger Controls */}
      {success && (
        <div className="mt-6 p-5 bg-gray-900/50 rounded-3xl border border-indigo-900">
          <div className="text-xs font-medium tracking-widest text-indigo-400 uppercase mb-3">TRIGGER CONTROLS</div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="dlmm-label flex items-center gap-2 mb-2">
                Trigger 1 (Upper) <span className="text-amber-500">⚡</span>
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
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>{triggerMin.toFixed(5)}</span>
                <span className="text-amber-400 font-semibold">{triggerPrice1.toFixed(5)}</span>
                <span>{triggerMax.toFixed(5)}</span>
              </div>
            </div>

            <div>
              <label className="dlmm-label flex items-center gap-2 mb-2">
                Trigger 2 (Lower) <span className="text-violet-500">🛑</span>
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
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>{triggerMin.toFixed(5)}</span>
                <span className="text-violet-400 font-semibold">{triggerPrice2.toFixed(5)}</span>
                <span>{triggerMax.toFixed(5)}</span>
              </div>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-400 mt-3 text-center">
            Slider stays within the chart&apos;s visible price range • Triggers start at your position limits
          </p>
        </div>
      )}
    </div>
  );
};

export default DLMMConnector;