import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Users, Package, Send, Check, X, Clock } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { apiService } from '../services/api';
import { Trade } from '../types/game';

export function TradingPanel() {
  const { state } = useGame();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [offeredResource, setOfferedResource] = useState<'manpower' | 'materials' | 'fuel' | 'food'>('materials');
  const [offeredAmount, setOfferedAmount] = useState(10);
  const [requestedResource, setRequestedResource] = useState<'manpower' | 'materials' | 'fuel' | 'food'>('food');
  const [requestedAmount, setRequestedAmount] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrades();
    loadPlayers();
  }, []);

  const loadTrades = async () => {
    try {
      const data = await apiService.getTrades();
      setTrades(data.trades || []);
    } catch (error) {
      console.error('Failed to load trades:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      const data = await apiService.getPlayers();
      setPlayers(data.players || []);
    } catch (error) {
      console.error('Failed to load players:', error);
    }
  };

  const createTrade = async () => {
    if (!selectedPlayer || !state.plot) return;

    setLoading(true);
    try {
      await apiService.createTrade(
        selectedPlayer,
        offeredResource,
        offeredAmount,
        requestedResource,
        requestedAmount
      );
      await loadTrades();
      setSelectedPlayer(null);
      setOfferedAmount(10);
      setRequestedAmount(10);
    } catch (error) {
      console.error('Failed to create trade:', error);
    }
    setLoading(false);
  };

  const acceptTrade = async (tradeId: string) => {
    setLoading(true);
    try {
      await apiService.acceptTrade(tradeId);
      await loadTrades();
    } catch (error) {
      console.error('Failed to accept trade:', error);
    }
    setLoading(false);
  };

  const rejectTrade = async (tradeId: string) => {
    setLoading(true);
    try {
      await apiService.rejectTrade(tradeId);
      await loadTrades();
    } catch (error) {
      console.error('Failed to reject trade:', error);
    }
    setLoading(false);
  };

  const resourceIcons = {
    manpower: Users,
    materials: Package,
    fuel: Package,
    food: Package
  };

  const resourceColors = {
    manpower: 'text-blue-400',
    materials: 'text-green-400',
    fuel: 'text-red-400',
    food: 'text-yellow-400'
  };

  const incomingTrades = trades.filter(t => t.toPlayerId === state.user?.id && t.status === 'pending');
  const outgoingTrades = trades.filter(t => t.fromPlayerId === state.user?.id && t.status === 'pending');
  const completedTrades = trades.filter(t => 
    (t.fromPlayerId === state.user?.id || t.toPlayerId === state.user?.id) && 
    t.status !== 'pending'
  );

  if (!state.plot) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ArrowLeftRight className="w-5 h-5 mr-2 text-purple-400" />
          Trading Center
        </h3>
        <div className="text-center py-8 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No base data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Trade */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ArrowLeftRight className="w-5 h-5 mr-2 text-purple-400" />
          Create Trade Offer
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* What you're offering */}
          <div className="space-y-4">
            <h4 className="font-medium text-white">You Offer</h4>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Resource</label>
              <select
                value={offeredResource}
                onChange={(e) => setOfferedResource(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="manpower">Manpower ({state.plot.resources.manpower})</option>
                <option value="materials">Materials ({state.plot.resources.materials})</option>
                <option value="fuel">Fuel ({state.plot.resources.fuel})</option>
                <option value="food">Food ({state.plot.resources.food})</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
              <input
                type="number"
                min="1"
                max={state.plot.resources[offeredResource]}
                value={offeredAmount}
                onChange={(e) => setOfferedAmount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* What you want */}
          <div className="space-y-4">
            <h4 className="font-medium text-white">You Want</h4>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Resource</label>
              <select
                value={requestedResource}
                onChange={(e) => setRequestedResource(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="manpower">Manpower</option>
                <option value="materials">Materials</option>
                <option value="fuel">Fuel</option>
                <option value="food">Food</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
              <input
                type="number"
                min="1"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Trade With</label>
          <select
            value={selectedPlayer || ''}
            onChange={(e) => setSelectedPlayer(parseInt(e.target.value) || null)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select a player...</option>
            {players
              .filter(p => p.id !== state.user?.id)
              .map(player => (
                <option key={player.id} value={player.id}>
                  {player.username} ({player.nation || 'No Nation'}) {player.is_ai ? '(AI)' : ''}
                </option>
              ))
            }
          </select>
        </div>

        <button
          onClick={createTrade}
          disabled={loading || !selectedPlayer || offeredAmount > state.plot.resources[offeredResource]}
          className="mt-4 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <Send className="w-4 h-4 inline mr-2" />
          {loading ? 'Creating...' : 'Create Trade Offer'}
        </button>
      </div>

      {/* Incoming Trade Offers */}
      {incomingTrades.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Incoming Trade Offers</h3>
          <div className="space-y-3">
            {incomingTrades.map(trade => {
              const OfferedIcon = resourceIcons[trade.offeredResource];
              const RequestedIcon = resourceIcons[trade.requestedResource];
              const fromPlayer = players.find(p => p.id === trade.fromPlayerId);
              
              return (
                <div key={trade.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-white font-medium">
                        {fromPlayer?.username || 'Unknown Player'}
                        {fromPlayer?.is_ai && <span className="text-xs text-blue-400 ml-1">(AI)</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <OfferedIcon className={`w-4 h-4 ${resourceColors[trade.offeredResource]}`} />
                          <span className="text-white">{trade.offeredAmount}</span>
                          <span className="text-gray-400 capitalize">{trade.offeredResource}</span>
                        </div>
                        <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center space-x-1">
                          <RequestedIcon className={`w-4 h-4 ${resourceColors[trade.requestedResource]}`} />
                          <span className="text-white">{trade.requestedAmount}</span>
                          <span className="text-gray-400 capitalize">{trade.requestedResource}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => acceptTrade(trade.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => rejectTrade(trade.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Expires: {new Date(trade.expiresAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outgoing Trade Offers */}
      {outgoingTrades.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Your Trade Offers</h3>
          <div className="space-y-3">
            {outgoingTrades.map(trade => {
              const OfferedIcon = resourceIcons[trade.offeredResource];
              const RequestedIcon = resourceIcons[trade.requestedResource];
              const toPlayer = players.find(p => p.id === trade.toPlayerId);
              
              return (
                <div key={trade.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-white font-medium">
                        To: {toPlayer?.username || 'Unknown Player'}
                        {toPlayer?.is_ai && <span className="text-xs text-blue-400 ml-1">(AI)</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <OfferedIcon className={`w-4 h-4 ${resourceColors[trade.offeredResource]}`} />
                          <span className="text-white">{trade.offeredAmount}</span>
                          <span className="text-gray-400 capitalize">{trade.offeredResource}</span>
                        </div>
                        <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center space-x-1">
                          <RequestedIcon className={`w-4 h-4 ${resourceColors[trade.requestedResource]}`} />
                          <span className="text-white">{trade.requestedAmount}</span>
                          <span className="text-gray-400 capitalize">{trade.requestedResource}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 text-sm">Pending</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Expires: {new Date(trade.expiresAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Trade History */}
      {completedTrades.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Trade History</h3>
          <div className="space-y-2">
            {completedTrades.slice(0, 5).map(trade => {
              const OfferedIcon = resourceIcons[trade.offeredResource];
              const RequestedIcon = resourceIcons[trade.requestedResource];
              const isIncoming = trade.toPlayerId === state.user?.id;
              const otherPlayer = players.find(p => 
                p.id === (isIncoming ? trade.fromPlayerId : trade.toPlayerId)
              );
              
              return (
                <div key={trade.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-white">
                        {isIncoming ? 'Received from' : 'Sent to'}: {otherPlayer?.username || 'Unknown'}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <OfferedIcon className={`w-3 h-3 ${resourceColors[trade.offeredResource]}`} />
                          <span className="text-sm text-white">{trade.offeredAmount}</span>
                        </div>
                        <ArrowLeftRight className="w-3 h-3 text-gray-400" />
                        <div className="flex items-center space-x-1">
                          <RequestedIcon className={`w-3 h-3 ${resourceColors[trade.requestedResource]}`} />
                          <span className="text-sm text-white">{trade.requestedAmount}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      trade.status === 'accepted' ? 'bg-green-600 text-green-100' :
                      trade.status === 'rejected' ? 'bg-red-600 text-red-100' :
                      'bg-gray-600 text-gray-100'
                    }`}>
                      {trade.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}