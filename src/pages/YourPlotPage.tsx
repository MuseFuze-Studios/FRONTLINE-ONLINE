import React, { useState } from 'react';
import { MapPin, Shield, Clock, AlertTriangle, TrendingUp, Truck, Activity, Package, Users, Zap, Building, Target, Settings } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { BuildMenu } from '../components/BuildMenu';
import { TroopPanel } from '../components/TroopPanel';
import { TradingPanel } from '../components/TradingPanel';
import { EnhancedResourcePanel } from '../components/EnhancedResourcePanel';
import { MoraleSystem } from '../components/MoraleSystem';
import { SupplyLineSystem } from '../components/SupplyLineSystem';
import { CommandAbilities } from '../components/CommandAbilities';

export function YourPlotPage() {
  const { state } = useGame();
  const { user, plot } = state;
  const [activeTab, setActiveTab] = useState<'overview' | 'construction' | 'military' | 'resources' | 'trading' | 'command'>('overview');

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

  // Calculate key metrics
  const totalBuildings = plot.buildings.filter(b => !b.isUnderConstruction).length;
  const totalTroops = plot.troops.reduce((sum, troop) => sum + troop.count, 0);
  const avgMorale = plot.troops.length > 0 
    ? Math.round(plot.troops.reduce((sum, troop) => sum + troop.morale, 0) / plot.troops.length)
    : 100;
  const efficiency = Math.min(100, Math.floor((totalBuildings * 10 + totalTroops * 2 + avgMorale) / 3));

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'construction', label: 'Build', icon: Building },
    { id: 'military', label: 'Military', icon: Users },
    { id: 'resources', label: 'Resources', icon: Package },
    { id: 'trading', label: 'Trade', icon: TrendingUp },
    { id: 'command', label: 'Command', icon: Zap }
  ];

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 border border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {currentHex?.name || 'Unknown Sector'}
              </h1>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-300">Commander {user.username}</span>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    territoryStatus === 'Under Attack' ? 'bg-red-400 animate-pulse' :
                    territoryStatus === 'Contested' ? 'bg-yellow-400' : 'bg-green-400'
                  }`}></div>
                  <span className={statusColor}>{territoryStatus}</span>
                </div>
                <span className="text-purple-400 capitalize">
                  {plot.resourceSpecialization} Specialist
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">{efficiency}%</div>
            <div className="text-sm text-gray-400">Base Efficiency</div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {territoryStatus !== 'Secure' && (
        <div className={`p-3 rounded-lg border ${
          territoryStatus === 'Under Attack' 
            ? 'bg-red-600/20 border-red-600/50' 
            : 'bg-yellow-600/20 border-yellow-600/50'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`w-4 h-4 ${
              territoryStatus === 'Under Attack' ? 'text-red-400' : 'text-yellow-400'
            }`} />
            <span className={`font-medium ${
              territoryStatus === 'Under Attack' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {territoryStatus === 'Under Attack' 
                ? 'ALERT: Your sector is under enemy attack!'
                : 'WARNING: This sector is contested.'
              }
            </span>
          </div>
        </div>
      )}

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <Package className="w-5 h-5 text-green-400" />
            <div className="text-right">
              <div className="text-lg font-bold text-green-400">{plot.resources.materials}</div>
              <div className="text-xs text-gray-400">Materials</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-blue-400" />
            <div className="text-right">
              <div className="text-lg font-bold text-blue-400">{plot.population?.current || 0}</div>
              <div className="text-xs text-gray-400">Population</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <Building className="w-5 h-5 text-purple-400" />
            <div className="text-right">
              <div className="text-lg font-bold text-purple-400">{totalBuildings}</div>
              <div className="text-xs text-gray-400">Buildings</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <Target className="w-5 h-5 text-red-400" />
            <div className="text-right">
              <div className="text-lg font-bold text-red-400">{totalTroops}</div>
              <div className="text-xs text-gray-400">Forces</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex border-b border-gray-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnhancedResourcePanel />
              <div className="space-y-6">
                <MoraleSystem />
                <SupplyLineSystem />
              </div>
            </div>
          )}
          
          {activeTab === 'construction' && <BuildMenu />}
          
          {activeTab === 'military' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TroopPanel />
              <MoraleSystem />
            </div>
          )}
          
          {activeTab === 'resources' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnhancedResourcePanel />
              <SupplyLineSystem />
            </div>
          )}
          
          {activeTab === 'trading' && <TradingPanel />}
          
          {activeTab === 'command' && <CommandAbilities />}
        </div>
      </div>
    </div>
  );
}