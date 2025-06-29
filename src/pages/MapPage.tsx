import React, { useState, useEffect } from 'react';
import { Globe, Users, MapPin, Sword, Shield, Target, Activity, AlertTriangle, TrendingUp, Eye, Zap } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { RealTimeMap } from '../components/RealTimeMap';
import { UnitMovementTracker } from '../components/UnitMovementTracker';
import { DeploymentModal } from '../components/DeploymentModal';
import { apiService } from '../services/api';

export function MapPage() {
  const { state } = useGame();
  const { nations, battles } = state;
  const [showDeployment, setShowDeployment] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'movements' | 'intelligence'>('overview');
  const [battleStats, setBattleStats] = useState({
    activeBattles: 0,
    recentVictories: 0,
    territoriesLost: 0,
    territoriesGained: 0
  });

  useEffect(() => {
    loadBattleStats();
  }, []);

  const loadBattleStats = async () => {
    try {
      const data = await apiService.getBattleStats();
      setBattleStats(data.stats || battleStats);
    } catch (error) {
      console.error('Failed to load battle stats:', error);
    }
  };

  const activeBattles = battles.filter(b => b.status === 'ongoing');
  const territoryControl = nations.map(nation => ({
    ...nation,
    controlPercentage: Math.round((state.hexMap.filter(h => h.nation === nation.id).length / state.hexMap.length) * 100),
    contestedTerritories: state.hexMap.filter(h => h.nation === nation.id && h.isContested).length,
    underAttack: state.hexMap.filter(h => h.nation === nation.id && h.underAttack).length
  }));

  const userNation = nations.find(n => n.id === state.user?.nation);
  const userTerritories = state.hexMap.filter(h => h.owner === state.user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Global Theater Command</h1>
            <p className="opacity-90">Real-time strategic overview and battlefield intelligence</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{state.hexMap.length}</div>
            <div className="text-sm opacity-75">Active Sectors</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-400">{activeBattles.length}</div>
              <div className="text-sm text-gray-400">Active Battles</div>
            </div>
            <Sword className="w-8 h-8 text-red-400 opacity-75" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {state.hexMap.filter(h => h.isContested).length}
              </div>
              <div className="text-sm text-gray-400">Contested Zones</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400 opacity-75" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-400">{userTerritories.length}</div>
              <div className="text-sm text-gray-400">Your Territories</div>
            </div>
            <Shield className="w-8 h-8 text-blue-400 opacity-75" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {userNation?.resources.warPoints || 0}
              </div>
              <div className="text-sm text-gray-400">War Points</div>
            </div>
            <Target className="w-8 h-8 text-green-400 opacity-75" />
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-2 border border-gray-700">
        <button
          onClick={() => setSelectedView('overview')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            selectedView === 'overview'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Strategic Overview</span>
        </button>
        <button
          onClick={() => setSelectedView('movements')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            selectedView === 'movements'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Unit Movements</span>
        </button>
        <button
          onClick={() => setSelectedView('intelligence')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            selectedView === 'intelligence'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Intelligence</span>
        </button>
        <div className="flex-1"></div>
        <button
          onClick={() => setShowDeployment(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <Target className="w-4 h-4" />
          <span>Deploy Forces</span>
        </button>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-400" />
                  Real-Time Theater Map
                </h3>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">Northern Union</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-300">Eastern Dominion</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Southern Syndicate</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-gray-300">Neutral</span>
                  </div>
                </div>
              </div>
              <RealTimeMap showMovements={true} />
            </div>
          </div>

          {/* Nation Control Panel */}
          <div className="space-y-4">
            {territoryControl.map((nation) => (
              <div key={nation.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white">{nation.name}</h4>
                  <div className={`w-3 h-3 rounded-full ${
                    nation.color === 'blue' ? 'bg-blue-500' :
                    nation.color === 'red' ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Territory Control</span>
                      <span className="text-white font-medium">{nation.controlPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          nation.color === 'blue' ? 'bg-blue-500' :
                          nation.color === 'red' ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${nation.controlPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 bg-gray-700 rounded">
                      <div className="font-bold text-white">{nation.territories}</div>
                      <div className="text-gray-400">Sectors</div>
                    </div>
                    <div className="text-center p-2 bg-gray-700 rounded">
                      <div className="font-bold text-white">{nation.totalPlayers}</div>
                      <div className="text-gray-400">Players</div>
                    </div>
                    <div className="text-center p-2 bg-gray-700 rounded">
                      <div className="font-bold text-yellow-400">{nation.contestedTerritories}</div>
                      <div className="text-gray-400">Contested</div>
                    </div>
                    <div className="text-center p-2 bg-gray-700 rounded">
                      <div className="font-bold text-red-400">{nation.underAttack}</div>
                      <div className="text-gray-400">Under Attack</div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-600">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">War Points:</span>
                      <span className="text-purple-400 font-medium">{nation.resources.warPoints}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedView === 'movements' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-400" />
              Movement Tracking
            </h3>
            <RealTimeMap showMovements={true} />
          </div>
          <UnitMovementTracker />
        </div>
      )}

      {selectedView === 'intelligence' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Battle Intelligence */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Sword className="w-5 h-5 mr-2 text-red-400" />
              Battle Intelligence
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-red-400 font-medium">Active Conflicts</span>
                  <span className="text-red-400 font-bold">{battleStats.activeBattles}</span>
                </div>
              </div>
              <div className="p-3 bg-green-600/20 border border-green-600/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-green-400 font-medium">Recent Victories</span>
                  <span className="text-green-400 font-bold">{battleStats.recentVictories}</span>
                </div>
              </div>
              <div className="p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-400 font-medium">Territories Lost</span>
                  <span className="text-yellow-400 font-bold">{battleStats.territoriesLost}</span>
                </div>
              </div>
              <div className="p-3 bg-blue-600/20 border border-blue-600/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-blue-400 font-medium">Territories Gained</span>
                  <span className="text-blue-400 font-bold">{battleStats.territoriesGained}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Assets */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-400" />
              Strategic Assets
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Mountain Sectors:</span>
                <span className="text-blue-400">{state.hexMap.filter(h => h.type === 'mountain').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Resource Nodes:</span>
                <span className="text-green-400">{state.hexMap.filter(h => h.type === 'resource').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Coastal Sectors:</span>
                <span className="text-cyan-400">{state.hexMap.filter(h => h.type === 'water').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Neutral Zones:</span>
                <span className="text-gray-400">{state.hexMap.filter(h => h.nation === 'neutral').length}</span>
              </div>
            </div>
          </div>

          {/* Threat Assessment */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
              Threat Assessment
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">Overall Threat Level</span>
                  <span className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">MODERATE</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Border Tensions:</span>
                  <span className="text-orange-400">High</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Enemy Activity:</span>
                  <span className="text-yellow-400">Moderate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Supply Lines:</span>
                  <span className="text-green-400">Secure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeploymentModal 
        isOpen={showDeployment} 
        onClose={() => setShowDeployment(false)} 
      />
    </div>
  );
}