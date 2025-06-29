import React, { useState, useEffect } from 'react';
import { Globe, Users, MapPin, Sword, Shield, Target, Activity, AlertTriangle, TrendingUp, Eye, Zap, Radar, Search, Filter } from 'lucide-react';
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
  const [intelligenceData, setIntelligenceData] = useState({
    enemyMovements: [],
    threatLevel: 'MODERATE',
    reconReports: [],
    supplyRoutes: [],
    vulnerabilities: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNation, setFilterNation] = useState<string>('all');

  useEffect(() => {
    loadBattleStats();
    loadIntelligenceData();
  }, []);

  const loadBattleStats = async () => {
    try {
      const data = await apiService.getBattleStats();
      setBattleStats(data.stats || battleStats);
    } catch (error) {
      console.error('Failed to load battle stats:', error);
    }
  };

  const loadIntelligenceData = async () => {
    try {
      // Simulate intelligence gathering
      const mockIntelligence = {
        enemyMovements: [
          { id: 1, faction: 'dominion', location: 'Sector Alpha-7', type: 'Troop Buildup', confidence: 85, timestamp: Date.now() - 3600000 },
          { id: 2, faction: 'syndicate', location: 'Sector Beta-3', type: 'Supply Convoy', confidence: 72, timestamp: Date.now() - 7200000 },
          { id: 3, faction: 'union', location: 'Sector Gamma-1', type: 'Fortification', confidence: 91, timestamp: Date.now() - 1800000 }
        ],
        threatLevel: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MODERATE' : 'LOW',
        reconReports: [
          { id: 1, sector: 'Northern Front', status: 'Enemy armor detected', priority: 'high', time: '2 hours ago' },
          { id: 2, sector: 'Eastern Border', status: 'Supply lines vulnerable', priority: 'medium', time: '4 hours ago' },
          { id: 3, sector: 'Central Command', status: 'All clear', priority: 'low', time: '6 hours ago' }
        ],
        supplyRoutes: [
          { id: 1, route: 'Alpha to Beta', status: 'secure', efficiency: 95 },
          { id: 2, route: 'Beta to Gamma', status: 'threatened', efficiency: 60 },
          { id: 3, route: 'Gamma to Delta', status: 'cut', efficiency: 0 }
        ],
        vulnerabilities: [
          { sector: 'Eastern Flank', risk: 'High', description: 'Insufficient air cover' },
          { sector: 'Supply Depot 7', risk: 'Medium', description: 'Limited defensive positions' }
        ]
      };
      setIntelligenceData(mockIntelligence);
    } catch (error) {
      console.error('Failed to load intelligence data:', error);
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

  // Filter territories based on search and nation filter
  const filteredTerritories = state.hexMap.filter(hex => {
    const matchesSearch = searchTerm === '' || hex.name.toLowerCase().includes(searchTerm.toLowerCase()) || hex.id.includes(searchTerm);
    const matchesNation = filterNation === 'all' || hex.nation === filterNation;
    return matchesSearch && matchesNation;
  });

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Global Theater Command</h1>
            <p className="opacity-90">Real-time strategic overview and battlefield intelligence</p>
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <span>Threat Level: <span className={`font-bold ${
                intelligenceData.threatLevel === 'HIGH' ? 'text-red-300' :
                intelligenceData.threatLevel === 'MODERATE' ? 'text-yellow-300' : 'text-green-300'
              }`}>{intelligenceData.threatLevel}</span></span>
              <span>Last Intel Update: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{filteredTerritories.length}</div>
            <div className="text-sm opacity-75">Active Sectors</div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-400">{activeBattles.length}</div>
              <div className="text-sm text-gray-400">Active Battles</div>
              <div className="text-xs text-red-300 mt-1">+{battleStats.recentVictories} victories today</div>
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
              <div className="text-xs text-yellow-300 mt-1">{intelligenceData.enemyMovements.length} enemy movements</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400 opacity-75" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-400">{userTerritories.length}</div>
              <div className="text-sm text-gray-400">Your Territories</div>
              <div className="text-xs text-blue-300 mt-1">{userNation?.controlPercentage || 0}% nation control</div>
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
              <div className="text-xs text-green-300 mt-1">Rank #{Math.floor(Math.random() * 10) + 1} globally</div>
            </div>
            <Target className="w-8 h-8 text-green-400 opacity-75" />
          </div>
        </div>
      </div>

      {/* Enhanced View Selector */}
      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-2 border border-gray-700">
        <div className="flex items-center space-x-2">
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
            <Radar className="w-4 h-4" />
            <span>Intelligence</span>
          </button>
        </div>
        
        {/* Search and Filter */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sectors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterNation}
            onChange={(e) => setFilterNation(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Nations</option>
            <option value="union">Union</option>
            <option value="dominion">Dominion</option>
            <option value="syndicate">Syndicate</option>
            <option value="neutral">Neutral</option>
          </select>
          <button
            onClick={() => setShowDeployment(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Target className="w-4 h-4" />
            <span>Deploy Forces</span>
          </button>
        </div>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Map */}
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

          {/* Enhanced Nation Control Panel */}
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
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-400">Threat Level:</span>
                      <span className={`font-medium ${
                        Math.random() > 0.6 ? 'text-red-400' : 
                        Math.random() > 0.3 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {Math.random() > 0.6 ? 'HIGH' : Math.random() > 0.3 ? 'MODERATE' : 'LOW'}
                      </span>
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
          {/* Enhanced Intelligence Reports */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Radar className="w-5 h-5 mr-2 text-green-400" />
              Enemy Movements
            </h3>
            <div className="space-y-3">
              {intelligenceData.enemyMovements.map((movement) => (
                <div key={movement.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      movement.faction === 'union' ? 'text-blue-400' :
                      movement.faction === 'dominion' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {movement.faction.toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      movement.confidence > 80 ? 'bg-green-600 text-green-100' :
                      movement.confidence > 60 ? 'bg-yellow-600 text-yellow-100' :
                      'bg-red-600 text-red-100'
                    }`}>
                      {movement.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-white text-sm">{movement.type}</div>
                  <div className="text-gray-400 text-xs">{movement.location}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {Math.floor((Date.now() - movement.timestamp) / 60000)} minutes ago
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reconnaissance Reports */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Eye className="w-5 h-5 mr-2 text-blue-400" />
              Recon Reports
            </h3>
            <div className="space-y-3">
              {intelligenceData.reconReports.map((report) => (
                <div key={report.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{report.sector}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      report.priority === 'high' ? 'bg-red-600 text-red-100' :
                      report.priority === 'medium' ? 'bg-yellow-600 text-yellow-100' :
                      'bg-green-600 text-green-100'
                    }`}>
                      {report.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-300 text-sm">{report.status}</div>
                  <div className="text-gray-500 text-xs mt-1">{report.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Supply Route Status */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
              Supply Routes
            </h3>
            <div className="space-y-3">
              {intelligenceData.supplyRoutes.map((route) => (
                <div key={route.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{route.route}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      route.status === 'secure' ? 'bg-green-600 text-green-100' :
                      route.status === 'threatened' ? 'bg-yellow-600 text-yellow-100' :
                      'bg-red-600 text-red-100'
                    }`}>
                      {route.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Efficiency:</span>
                    <span className={`text-sm font-medium ${
                      route.efficiency > 80 ? 'text-green-400' :
                      route.efficiency > 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {route.efficiency}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${
                        route.efficiency > 80 ? 'bg-green-400' :
                        route.efficiency > 50 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${route.efficiency}%` }}
                    ></div>
                  </div>
                </div>
              ))}
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
                  <span className={`px-2 py-1 rounded text-xs ${
                    intelligenceData.threatLevel === 'HIGH' ? 'bg-red-600 text-red-100' :
                    intelligenceData.threatLevel === 'MODERATE' ? 'bg-yellow-600 text-yellow-100' :
                    'bg-green-600 text-green-100'
                  }`}>
                    {intelligenceData.threatLevel}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div className={`h-2 rounded-full ${
                    intelligenceData.threatLevel === 'HIGH' ? 'bg-red-400' :
                    intelligenceData.threatLevel === 'MODERATE' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} style={{ 
                    width: intelligenceData.threatLevel === 'HIGH' ? '85%' :
                           intelligenceData.threatLevel === 'MODERATE' ? '60%' : '30%'
                  }}></div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Border Tensions:</span>
                  <span className="text-orange-400">High</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Enemy Activity:</span>
                  <span className="text-yellow-400">{intelligenceData.threatLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Supply Lines:</span>
                  <span className="text-green-400">
                    {intelligenceData.supplyRoutes.filter(r => r.status === 'secure').length} Secure
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vulnerabilities */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-400" />
              Vulnerabilities
            </h3>
            <div className="space-y-3">
              {intelligenceData.vulnerabilities.map((vuln, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{vuln.sector}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      vuln.risk === 'High' ? 'bg-red-600 text-red-100' :
                      vuln.risk === 'Medium' ? 'bg-yellow-600 text-yellow-100' :
                      'bg-green-600 text-green-100'
                    }`}>
                      {vuln.risk} Risk
                    </span>
                  </div>
                  <div className="text-gray-300 text-sm">{vuln.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Intelligence Actions */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-purple-400" />
              Intelligence Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => loadIntelligenceData()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Radar className="w-4 h-4 inline mr-2" />
                Refresh Intelligence
              </button>
              <button
                onClick={() => alert('Reconnaissance mission launched!')}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4 inline mr-2" />
                Launch Recon Mission
              </button>
              <button
                onClick={() => alert('Counter-intelligence activated!')}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Counter-Intelligence
              </button>
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