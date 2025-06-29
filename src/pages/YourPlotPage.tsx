import React from 'react';
import { MapPin, Shield, Clock, AlertTriangle, TrendingUp, Truck } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { PlotPanel } from '../components/PlotPanel';
import { BuildMenu } from '../components/BuildMenu';
import { TroopPanel } from '../components/TroopPanel';
import { TradingPanel } from '../components/TradingPanel';

export function YourPlotPage() {
  const { state } = useGame();
  const { user, plot } = state;

  // Enable real-time updates for this page
  useRealTimeUpdates();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Please log in to access your base.</p>
        </div>
      </div>
    );
  }

  if (!plot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Base Assigned</h2>
          <p className="text-gray-400">You need to select a nation to be assigned a base.</p>
        </div>
      </div>
    );
  }

  const currentHex = state.hexMap.find(h => h.id === plot.hexId);
  const territoryStatus = currentHex?.underAttack ? 'Under Attack' : 
                         currentHex?.isContested ? 'Contested' : 'Secure';
  
  const statusColor = territoryStatus === 'Under Attack' ? 'text-red-400' :
                     territoryStatus === 'Contested' ? 'text-yellow-400' : 'text-green-400';

  // Calculate base efficiency
  const totalBuildings = plot.buildings.filter(b => !b.isUnderConstruction).length;
  const totalTroops = plot.troops.reduce((sum, troop) => sum + troop.count, 0);
  const avgMorale = plot.troops.length > 0 
    ? Math.round(plot.troops.reduce((sum, troop) => sum + troop.morale, 0) / plot.troops.length)
    : 100;

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {currentHex?.name || 'Unknown Sector'}
            </h1>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300">Commander {user.username}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  territoryStatus === 'Under Attack' ? 'bg-red-400 animate-pulse' :
                  territoryStatus === 'Contested' ? 'bg-yellow-400' : 'bg-green-400'
                }`}></div>
                <span className={`font-medium ${statusColor}`}>
                  Territory Status: {territoryStatus}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 capitalize">
                  {plot.resourceSpecialization} Specialist
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">
                  Last Updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Base Status</div>
            <div className="text-xl font-bold text-green-400">Operational</div>
            <div className="text-sm text-gray-400 mt-1">
              Efficiency: {Math.min(100, Math.floor((totalBuildings * 10 + totalTroops * 2 + avgMorale) / 3))}%
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {territoryStatus !== 'Secure' && (
        <div className={`p-4 rounded-lg border ${
          territoryStatus === 'Under Attack' 
            ? 'bg-red-600/20 border-red-600/50' 
            : 'bg-yellow-600/20 border-yellow-600/50'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`w-5 h-5 ${
              territoryStatus === 'Under Attack' ? 'text-red-400' : 'text-yellow-400'
            }`} />
            <span className={`font-medium ${
              territoryStatus === 'Under Attack' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {territoryStatus === 'Under Attack' 
                ? 'ALERT: Your sector is under enemy attack! Prepare defenses immediately.'
                : 'WARNING: This sector is contested. Enemy forces may be nearby.'
              }
            </span>
          </div>
        </div>
      )}

      {/* Population Warning */}
      {plot.population && plot.population.current >= plot.population.cap * 0.9 && (
        <div className="p-4 rounded-lg border bg-orange-600/20 border-orange-600/50">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span className="font-medium text-orange-400">
              Population capacity nearly full! Build housing to train more troops.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <PlotPanel />
          <TradingPanel />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <BuildMenu />
          <TroopPanel />
        </div>
      </div>

      {/* Performance Stats */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
          Base Performance Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {totalBuildings}
            </div>
            <div className="text-sm text-gray-400">Structures</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {totalTroops}
            </div>
            <div className="text-sm text-gray-400">Total Forces</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {avgMorale}%
            </div>
            <div className="text-sm text-gray-400">Avg Morale</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {Math.floor((plot.resources.materials + plot.resources.fuel + plot.resources.manpower + plot.resources.food) / 4)}
            </div>
            <div className="text-sm text-gray-400">Resource Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {totalBuildings * 10 + totalTroops * 5 + Math.floor(avgMorale / 10)}
            </div>
            <div className="text-sm text-gray-400">Defense Rating</div>
          </div>
        </div>
      </div>
    </div>
  );
}