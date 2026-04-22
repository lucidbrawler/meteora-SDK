import React, { useState } from 'react';
import DLMM from '@meteora-ag/dlmm';
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js'; // ← Direct import fixes the BN mismatch

const DLMMConnector: React.FC = () => {
  const [rpcUrl, setRpcUrl] = useState('https://solana-rpc.publicnode.com');
  const [poolAddress, setPoolAddress] = useState(
    'ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq'
  );
  const [dlmmPool, setDlmmPool] = useState<any>(null);
  const [activeBin, setActiveBin] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-2xl">🌊</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Meteora DLMM SDK</h2>
          <p className="text-gray-500 dark:text-gray-400">Fixed for Astro + Vite + Anchor 0.30.1</p>
        </div>
      </div>

      {/* Same inputs as before */}
      <div className="space-y-5 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">RPC Endpoint</label>
          <input
            type="text"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">DLMM Pool Address</label>
          <input
            type="text"
            value={poolAddress}
            onChange={(e) => setPoolAddress(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <button
        onClick={initializeSDK}
        disabled={loading || !poolAddress}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.985]"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          '🔌 Connect to DLMM Pool'
        )}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {success && dlmmPool && (
        <div className="mt-6 p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-2xl">
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
            className="mt-5 w-full py-3 text-sm font-medium border border-green-300 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 rounded-xl transition-colors"
          >
            🔄 Refresh Active Bin
          </button>
        </div>
      )}
    </div>
  );
};

export default DLMMConnector;