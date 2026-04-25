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
  const [triggerPrice1, setTriggerPrice1] = useState(145);
  const [triggerPrice2, setTriggerPrice2] = useState(135);

  const initializeSDK = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setDlmmPool(null);
    setActiveBin(null);

    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const pubkey = new PublicKey(poolAddress);

      const pool = await DLMM.create(connection, pubkey);
      setDlmmPool(pool);

      const bin = await pool.getActiveBin();
      setActiveBin(bin);

      // Fetch bins for chart
      try {
        const binsData = await pool.getBinsAroundActiveBin(40, 40);
        setBins(binsData.bins || []);
      } catch (e) {
        console.warn('Could not fetch bins for chart:', e);
        setBins([]);
      }

      // Set smart default triggers around current price
      const currentPrice = parseFloat(bin?.price?.toString() || '140');
      setTriggerPrice1(currentPrice * 1.035);
      setTriggerPrice2(currentPrice * 0.965);

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveBin = async () => {
    if (!dlmmPool) return;
    setLoading(true);
    try {
      await dlmmPool.refetchStates();
      const bin = await dlmmPool.getActiveBin();
      setActiveBin(bin);

      try {
        const binsData = await dlmmPool.getBinsAroundActiveBin(40, 40);
        setBins(binsData.bins || []);
      } catch (e) {
        console.warn('Refresh bins failed:', e);
      }
    } catch (err: any) {
      setError('Refresh failed: ' + err.message);
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
      console.log('Position fetched from SDK:', position);
      setPositionInfo(position);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch position info. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Update trigger defaults when active bin changes
  useEffect(() => {
    if (activeBin) {
      const currentPrice = parseFloat(activeBin?.price?.toString() || '140');
      if (triggerPrice1 === 145 && triggerPrice2 === 135) {
        setTriggerPrice1(currentPrice * 1.035);
        setTriggerPrice2(currentPrice * 0.965);
      }
    }
  }, [activeBin]);

  return (
    <div className="dlmm-container">
      {/* Header */}
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

      {/* Inputs */}
      <div className="dlmm-input-group">
        <label className="dlmm-label">RPC Endpoint</label>
        <input
          type="text"
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
          className="dlmm-input"
          placeholder="https://solana-rpc.publicnode.com"
        />
      </div>

      <div className="dlmm-input-group">
        <label className="dlmm-label">DLMM Pool Address</label>
        <input
          type="text"
          value={poolAddress}
          onChange={(e) => setPoolAddress(e.target.value)}
          className="dlmm-input"
          placeholder="BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y"
        />
      </div>

      <div className="dlmm-input-group">
        <label className="dlmm-label">Position Address</label>
        <input
          type="text"
          value={positionAddress}
          onChange={(e) => setPositionAddress(e.target.value)}
          className="dlmm-input"
          placeholder="HP2grHkQbcpFSdoFYpdsD2SEFMFinc37L1AYbbVDSUvU"
        />
        <p className="dlmm-helper-text">
          Uses <span className="font-mono">dlmmPool.getPosition()</span>
        </p>
      </div>

      {/* Trigger Points for Chart */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="dlmm-input-group">
          <label className="dlmm-label flex items-center gap-2">
            Trigger 1 <span className="text-amber-500">⚡</span> <span className="text-[10px] text-slate-400">(e.g. Take Profit)</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={triggerPrice1}
            onChange={(e) => setTriggerPrice1(parseFloat(e.target.value) || 0)}
            className="dlmm-input border-amber-300 focus:border-amber-500"
            placeholder="145.00"
          />
        </div>
        <div className="dlmm-input-group">
          <label className="dlmm-label flex items-center gap-2">
            Trigger 2 <span className="text-violet-500">🛑</span> <span className="text-[10px] text-slate-400">(e.g. Stop Loss)</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={triggerPrice2}
            onChange={(e) => setTriggerPrice2(parseFloat(e.target.value) || 0)}
            className="dlmm-input border-violet-300 focus:border-violet-500"
            placeholder="135.00"
          />
        </div>
      </div>
      <p className="text-[10px] text-slate-400 -mt-1 mb-4">These control the horizontal trigger lines on the price chart below</p>

      {/* Action Buttons */}
      <div className="dlmm-buttons">
        <button
          onClick={initializeSDK}
          disabled={loading || !poolAddress}
          className="dlmm-button dlmm-button-primary"
        >
          {loading ? (
            <>
              <div className="spinner" />
              Connecting...
            </>
          ) : (
            <>Connect to Pool</>
          )}
        </button>

        <button
          onClick={fetchPositionInfo}
          disabled={loading || !dlmmPool || !positionAddress}
          className="dlmm-button dlmm-button-secondary"
        >
          {loading ? (
            <>
              <div className="spinner" />
              Fetching Position...
            </>
          ) : (
            <>Get Position</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && <div className="dlmm-error">⚠️ {error}</div>}

      {/* Consolidated Status Card */}
      <StatusCard
        dlmmPool={dlmmPool}
        activeBin={activeBin}
        positionInfo={positionInfo}
        positionAddress={positionAddress}
        success={success}
      />

      {/* Price Chart with Configurable Triggers */}
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

    </div>
  );
};

export default DLMMConnector;