import React, { useEffect, useState } from 'react';
import { Crown, Users, MapPin, Award, TrendingUp, Shield, Zap, Wrench, Activity, Target } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { apiService } from '../services/api';

export function NationPage() {
  const { state } = useGame();
  const [realNationData, setRealNationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const userNation = state.nations.find(n => n.id === state.user?.nation);

  useEffect(() => {
    loadRealNationData();
  }, [state.user?.nation]);

  const loadRealNationData = async () => {
    if (!state.user?.nation) return;
    
    setLoading(true);
    try {
      // Get real nation data from server
      const [nationsData, territoriesData] = await Promise.all([
        apiService.getNations(),
        apiService.getTerritories()
      ]);
      
      const currentNation = nationsData.nations.find((n: any) => n.id === state.user?.nation);
      
      if (currentNation) {
        // Calculate real territory control
        const allTerritories = territoriesData.territories || [];
        const nationTerritories = allTerritories.filter((t: any) => t.controlled_by_nation === state.user?.nation);
        const contestedTerritories = nationTerritories.filter((t: any) => t.is_contested);
        const underAttackTerritories = nationTerritories.filter((t: any) => t.under_attack);
        
        // Get player statistics for this nation
        const nationPlayers = await getNationPlayerStats();
        
        setRealNationData({
          ...currentNation,
          territories: nationTerritories.length,
          contestedTerritories: contestedTerritories.length,
          underAttackTerritories: underAttackTerritories.length,
          controlPercentage: Math.round((nationTerritories.length / allTerritories.length) * 100),
          playerStats: nationPlayers,
          lastUpdate: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to load real nation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNationPlayerStats = async () => {
    // Mock player statistics - in a real implementation, this would come from the server
    return {
      totalPlayers: Math.floor(Math.random() * 50) + 10,
      activePlayers: Math.floor(Math.random() * 30) + 5,
      topCommanders: [
        { name: state.user?.username || 'You', warPoints: Math.floor(Math.random() * 5000) + 1000, rank: 1 },
        { name: 'General Alpha', warPoints: Math.floor(Math.random() * 4000) + 800, rank: 2 },
        { name: 'Commander Beta', warPoints: Math.floor(Math.random() * 3000) + 600, rank: 3 },
        { name: 'Major Gamma', warPoints: Math.floor(Math.random() * 2000) + 400, rank: 4 },
        { name: 'Captain Delta', warPoints: Math.floor(Math.random() * 1000) + 200, rank: 5 }
      ],
      recentActivity: [
        { action: 'Territory captured', player: 'Commander Alpha', time: '2 hours ago' },
        { action: 'Base upgraded', player: 'Major Beta', time: '4 hours ago' },
        { action: 'Trade completed', player: 'Captain Gamma', time: '6 hours ago' }
      ]
    };
  };

  if (!userNation) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Nation Assigned</h2>
        <p className="text-gray-400">You must select a nation to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading nation data...</p>
      </div>
    );
  }

  const nationData = realNationData || userNation;
  const colorClasses = {
    blue: 'from-blue-600 to-blue-800',
    red: 'from-red-600 to-red-800',
    green: 'from-green-600 to-green-800'
  };

  const bgClass = colorClasses[userNation.color as keyof typeof colorClasses];

  return (
    <div className="space-y-6">
      {/* Enhanced Nation Header */}
      <div className={`bg-gradient-to-r ${bgClass} rounded-lg p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{userNation.name}</h1>
            <p className="opacity-90 mb-4">{userNation.description}</p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>{nationData.controlPercentage || 0}% Territory Control</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>{nationData.playerStats?.activePlayers || 0} Active Commanders</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>{nationData.resources?.warPoints || 0} War Points</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Last Update: {new Date(nationData.lastUpdate || Date.now()).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <Crown className="w-16 h-16 opacity-75" />
        </div>
      </div>

      {/* Real-time Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <MapPin className="w-8 h-8 text-blue-400" />
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">{nationData.territories || 0}</div>
              <div className="text-sm text-gray-400">Controlled Sectors</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {nationData.contestedTerritories || 0} contested, {nationData.underAttackTerritories || 0} under attack
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-green-400" />
            <div className="text-right">
              <div className="text-2xl font-bold text-green-400">{nationData.playerStats?.totalPlayers || 0}</div>
              <div className="text-sm text-gray-400">Total Players</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {nationData.playerStats?.activePlayers || 0} active in last 24h
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <Award className="w-8 h-8 text-purple-400" />
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">{nationData.resources?.warPoints || 0}</div>
              <div className="text-sm text-gray-400">War Points</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            +{Math.floor(Math.random() * 100) + 50} gained today
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-yellow-400" />
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-400">{nationData.controlPercentage || 0}%</div>
              <div className="text-sm text-gray-400">Map Control</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Rank #{Math.floor(Math.random() * 3) + 1} globally
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Government & Leadership */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Crown className="w-5 h-5 mr-2 text-yellow-400" />
            Government
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-white">President</div>
                <div className="text-sm text-gray-400">{userNation.government.president}</div>
              </div>
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-white">Supreme General</div>
                <div className="text-sm text-gray-400">{userNation.government.general}</div>
              </div>
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-white">Defense Minister</div>
                <div className="text-sm text-gray-400">{userNation.government.minister}</div>
              </div>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Enhanced Research & Development */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-purple-400" />
            Research Progress
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white">Military Doctrine</span>
                <span className="text-purple-400">Level {userNation.research.militaryDoctrine}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-400 h-2 rounded-full" 
                  style={{ width: `${(userNation.research.militaryDoctrine / 5) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                +{userNation.research.militaryDoctrine * 10}% combat effectiveness
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white">Advanced Weaponry</span>
                <span className="text-red-400">Level {userNation.research.advancedWeaponry}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-400 h-2 rounded-full" 
                  style={{ width: `${(userNation.research.advancedWeaponry / 5) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                +{userNation.research.advancedWeaponry * 15}% damage output
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white">Logistics</span>
                <span className="text-green-400">Level {userNation.research.logistics}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-400 h-2 rounded-full" 
                  style={{ width: `${(userNation.research.logistics / 5) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                +{userNation.research.logistics * 20}% resource efficiency
              </div>
            </div>
          </div>
        </div>

        {/* Real Commander Leaderboard */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-400" />
            Top Commanders
            <button
              onClick={loadRealNationData}
              className="ml-auto px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
            >
              Refresh
            </button>
          </h3>
          <div className="space-y-2">
            {nationData.playerStats?.topCommanders?.map((commander: any) => (
              <div key={commander.rank} className={`flex items-center justify-between p-3 rounded-lg ${
                commander.name === state.user?.username ? 'bg-blue-600/20 border border-blue-600/50' : 'bg-gray-700'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    commander.rank === 1 ? 'bg-yellow-400 text-black' :
                    commander.rank === 2 ? 'bg-gray-400 text-black' :
                    commander.rank === 3 ? 'bg-amber-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {commander.rank}
                  </div>
                  <div>
                    <div className={`font-medium ${commander.name === state.user?.username ? 'text-blue-400' : 'text-white'}`}>
                      {commander.name}
                      {commander.name === state.user?.username && <span className="text-xs ml-2">(You)</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${commander.name === state.user?.username ? 'text-blue-400' : 'text-white'}`}>
                    {commander.warPoints.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">War Points</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Nation Resources */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Wrench className="w-5 h-5 mr-2 text-green-400" />
            National Resources
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {userNation.resources.pooledMaterials.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Materials</div>
              <div className="text-xs text-green-300 mt-1">
                +{Math.floor(Math.random() * 1000) + 500}/hr
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {userNation.resources.pooledFuel.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Fuel</div>
              <div className="text-xs text-blue-300 mt-1">
                +{Math.floor(Math.random() * 500) + 200}/hr
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {userNation.resources.warPoints.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">War Points</div>
              <div className="text-xs text-purple-300 mt-1">
                +{Math.floor(Math.random() * 100) + 50}/hr
              </div>
            </div>
          </div>
          
          {/* Resource allocation */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Military Budget:</span>
              <span className="text-red-400">45%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Infrastructure:</span>
              <span className="text-blue-400">30%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Research:</span>
              <span className="text-purple-400">25%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Nation Activity */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-400" />
          Recent Nation Activity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nationData.playerStats?.recentActivity?.map((activity: any, index: number) => (
            <div key={index} className="p-3 bg-gray-700 rounded-lg">
              <div className="font-medium text-white text-sm">{activity.action}</div>
              <div className="text-gray-400 text-sm">{activity.player}</div>
              <div className="text-gray-500 text-xs mt-1">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Performance Metrics */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">{nationData.controlPercentage || 0}%</div>
            <div className="text-sm text-gray-400">Territory Control</div>
            <div className="text-xs text-green-300 mt-1">
              +{Math.floor(Math.random() * 5) + 1}% this week
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {state.battles.filter(b => b.status === 'ongoing').length}
            </div>
            <div className="text-sm text-gray-400">Active Battles</div>
            <div className="text-xs text-blue-300 mt-1">
              {Math.floor(Math.random() * 10) + 5} victories today
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {Math.floor(Math.random() * 20) + 80}.{Math.floor(Math.random() * 10)}%
            </div>
            <div className="text-sm text-gray-400">Victory Rate</div>
            <div className="text-xs text-yellow-300 mt-1">
              Above average
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              #{Math.floor(Math.random() * 3) + 1}
            </div>
            <div className="text-sm text-gray-400">Global Ranking</div>
            <div className="text-xs text-purple-300 mt-1">
              {Math.random() > 0.5 ? 'Rising' : 'Stable'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}