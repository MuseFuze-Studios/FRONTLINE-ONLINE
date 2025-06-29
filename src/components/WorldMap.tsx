import React from 'react';
import { HexMap } from './HexMap';
import { Globe, Users, MapPin, Shield, Sword, AlertTriangle } from 'lucide-react';
import { useGame } from '../context/GameContext';

export function WorldMap() {
  const { state } = useGame();
  const { nations } = state;

  const territoryStats = nations.map(nation => {
    const controlledHexes = state.hexMap.filter(h => h.nation === nation.id);
    const contestedHexes = controlledHexes.filter(h => h.isContested);
    const underAttackHexes = controlledHexes.filter(h => h.underAttack);
    
    return {
      ...nation,
      controlledHexes: controlledHexes.length,
      contestedHexes: contestedHexes.length,
      underAttackHexes: underAttackHexes.length,
      controlPercentage: Math.round((controlledHexes.length / state.hexMap.length) * 100)
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-green-400" />
          Strategic Theater Map
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Northern Union</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Eastern Dominion</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Southern Syndicate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Neutral</span>
          </div>
        </div>
      </div>

      <HexMap />

      {/* Territory Control Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {territoryStats.map((nation) => (
          <div key={nation.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white">{nation.name}</h4>
              <div className={`w-3 h-3 rounded-full ${
                nation.color === 'blue' ? 'bg-blue-500' :
                nation.color === 'red' ? 'bg-red-500' : 'bg-green-500'
              }`}></div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Territory Control:</span>
                <span className="text-white font-medium">{nation.controlPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sectors:</span>
                <span className="text-white">{nation.controlledHexes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Contested:</span>
                <span className="text-yellow-400">{nation.contestedHexes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Under Attack:</span>
                <span className="text-red-400">{nation.underAttackHexes}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Strategic Information */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-blue-400" />
          Strategic Intelligence
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-600/20 border border-red-600/50 rounded-lg">
            <h4 className="font-medium text-red-400 mb-2 flex items-center">
              <Sword className="w-4 h-4 mr-2" />
              Active Conflicts
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Ongoing Battles:</span>
                <span className="text-red-400">{state.battles.filter(b => b.status === 'ongoing').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sectors Under Attack:</span>
                <span className="text-red-400">{state.hexMap.filter(h => h.underAttack).length}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
            <h4 className="font-medium text-yellow-400 mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Contested Zones
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Disputed Sectors:</span>
                <span className="text-yellow-400">{state.hexMap.filter(h => h.isContested).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Neutral Territory:</span>
                <span className="text-yellow-400">{state.hexMap.filter(h => h.nation === 'neutral').length}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-600/20 border border-blue-600/50 rounded-lg">
            <h4 className="font-medium text-blue-400 mb-2 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Strategic Assets
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Mountain Sectors:</span>
                <span className="text-blue-400">{state.hexMap.filter(h => h.type === 'mountain').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Sectors:</span>
                <span className="text-blue-400">{state.hexMap.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-400">
        <p>🏔️ Mountain sectors provide defensive bonuses • ⚔️ Red markers indicate active battles</p>
        <p>🟡 Yellow markers show your territory • Click sectors for detailed information</p>
      </div>
    </div>
  );
}