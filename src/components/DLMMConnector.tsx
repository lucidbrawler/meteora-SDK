import React, { useState } from 'react';
import DLMM from '@meteora-ag/dlmm';
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

const DLMMConnector: React.FC = () => {
  const [rpcUrl, setRpcUrl] = useState('https://solana-rpc.publicnode.com');
  const [poolAddress, setPoolAddress] = useState(
    'BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y'
  );
  const [dlmmPool, setDlmmPool] = useState<any>(null);
  const [activeBin, setActiveBin] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [positionAddress, setPositionAddress] = useState(
    'HP2grHkQbcpFSdoFYpdsD2SEFMFinc37L1AYbbVDSUvU'
  );
  const [positionInfo, setPositionInfo] = useState<any>(null);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl">🌊</span>
          </div>
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Meteora DLMM</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-1">SDK Playground • v0.30.1</p>
          </div>
        </div>
        <div className="px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full">
          Live on Solana
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-5 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">RPC Endpoint</label>
          <input
            type="text"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">DLMM Pool Address</label>
          <input
            type="text"
            value={poolAddress}
            onChange={(e) => setPoolAddress(e.target.value)}
            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Position Address</label>
          <div className="relative">
            <input
              type="text"
              value={positionAddress}
              onChange={(e) => setPositionAddress(e.target.value)}
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all pr-12"
            />
            <button
              onClick={() => copyToClipboard(positionAddress)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-purple-500 transition-colors"
              title="Copy position address"
            >
              📋
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Uses <span className="font-mono">dlmmPool.getPosition()</span></p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={initializeSDK}
          disabled={loading || !poolAddress}
          className="py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 text-base shadow-lg active:scale-[0.985] disabled:opacity-60"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            <>🔌 Connect to Pool</>
          )}
        </button>

        <button
          onClick={fetchPositionInfo}
          disabled={loading || !dlmmPool || !positionAddress}
          className="py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 text-base shadow-lg active:scale-[0.985] disabled:opacity-60"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Fetching...
            </>
          ) : (
            <>📍 Get Position</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-2xl text-red-700 dark:text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Pool Success Card */}
      {success && dlmmPool && (
        <div className="mb-6 p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-3xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="font-semibold text-green-700 dark:text-green-400">Successfully connected to DLMM!</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Pool</span>
              <span className="font-mono text-gray-900 dark:text-white break-all">{dlmmPool.pubkey.toString()}</span>
            </div>
            {activeBin && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Active Bin ID</span>
                  <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                    {activeBin.binId.toString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Price</span>
                  <span className="font-mono text-gray-900 dark:text-white">{activeBin.price.toString()}</span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={refreshActiveBin}
            disabled={loading}
            className="mt-5 w-full py-3 text-sm font-medium border border-green-300 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 rounded-2xl transition-colors"
          >
            🔄 Refresh Active Bin
          </button>
        </div>
      )}

      {/* Position Card */}
      {positionInfo && (
        <div className="mb-6 p-6 bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-3xl shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl flex items-center justify-center">
                <span className="text-xl">📍</span>
              </div>
              <div>
                <div className="font-semibold text-indigo-600 dark:text-indigo-400">Position Loaded</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">via dlmmPool.getPosition()</div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(JSON.stringify(positionInfo, null, 2))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-800"
            >
              📋 Copy JSON
            </button>
          </div>

          <div className="mb-4">
            <div className="text-[10px] font-mono text-gray-400 mb-1.5 px-1">RAW SDK RESPONSE</div>
            <pre className="text-[10px] leading-snug bg-gray-950 dark:bg-black text-emerald-400 p-4 rounded-2xl overflow-auto max-h-72 border border-gray-800 font-mono shadow-inner">
              {JSON.stringify(positionInfo, (key, value) => 
                typeof value === 'bigint' ? value.toString() : 
                value instanceof BN ? value.toString() : value, 
              2)}
            </pre>
          </div>

          <div className="text-center text-[10px] text-gray-400 dark:text-gray-500">
            Open DevTools Console (F12) for the same object + more details
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-[10px] text-gray-400 dark:text-gray-500">
        Built with ❤️ for the Meteora DLMM community • Data from public RPC
      </div>
    </div>
  );
};

export default DLMMConnector;