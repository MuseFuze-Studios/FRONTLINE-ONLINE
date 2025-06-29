import React from 'react';
import { Crown, Users, MapPin, Award, TrendingUp, Shield, Zap, Wrench } from 'lucide-react';
import { useGame } from '../context/GameContext';

export function NationPage() {
  const { state } = useGame();
  const userNation = state.nations.find(n => n.id === state.user?.nation);

  if (!userNation) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Nation Assigned</h2>
        <p className="text-gray-400">You must select a nation to view this page.</p>
      </div>
    );
  }

  const leaderboard = [
    { rank: 1, commander: userNation.government.general || 'General', contribution: 15420, isUser: false },
    { rank: 2, commander: userNation.government.minister || 'Minister', contribution: 12890, isUser: false },
    { rank: 3, commander: state.user?.username || 'You', contribution: 8750, isUser: true },
    { rank: 4, commander: 'Major Viktor Kane', contribution: 7650, isUser: false },
    { rank: 5, commander: 'Captain Elena Ross', contribution: 6890, isUser: false }
  ];

  const colorClasses = {
    blue: 'from-blue-600 to-blue-800',
    red: 'from-red-600 to-red-800',
    green: 'from-green-600 to-green-800'
  };

  const bgClass = colorClasses[userNation.color as keyof typeof colorClasses];
  const territoryControl = Math.round((state.hexMap.filter(h => h.nation === userNation.id).length / state.hexMap.length) * 100);

  return (
    <div className="space-y-6">
      {/* Nation Header */}
      <div className={`bg-gradient-to-r ${bgClass} rounded-lg p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{userNation.name}</h1>
            <p className="opacity-90 mb-4">{userNation.description}</p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>{territoryControl}% Territory Control</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>{userNation.totalPlayers.toLocaleString()} Active Commanders</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>{userNation.resources.warPoints} War Points</span>
              </div>
            </div>
          </div>
          <Crown className="w-16 h-16 opacity-75" />
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

        {/* Research & Development */}
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
            </div>
          </div>
        </div>

        {/* Commander Leaderboard */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-400" />
            Top Commanders
          </h3>
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div key={entry.rank} className={`flex items-center justify-between p-3 rounded-lg ${
                entry.isUser ? 'bg-blue-600/20 border border-blue-600/50' : 'bg-gray-700'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    entry.rank === 1 ? 'bg-yellow-400 text-black' :
                    entry.rank === 2 ? 'bg-gray-400 text-black' :
                    entry.rank === 3 ? 'bg-amber-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {entry.rank}
                  </div>
                  <div>
                    <div className={`font-medium ${entry.isUser ? 'text-blue-400' : 'text-white'}`}>
                      {entry.commander}
                      {entry.isUser && <span className="text-xs ml-2">(You)</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${entry.isUser ? 'text-blue-400' : 'text-white'}`}>
                    {entry.contribution.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">War Points</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nation Resources */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Wrench className="w-5 h-5 mr-2 text-green-400" />
            National Resources
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {userNation.resources.pooledMaterials.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Materials</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {userNation.resources.pooledFuel.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Fuel</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {userNation.resources.warPoints.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">War Points</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nation Statistics */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">{territoryControl}%</div>
            <div className="text-sm text-gray-400">Territory Control</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {state.battles.filter(b => b.status === 'ongoing').length}
            </div>
            <div className="text-sm text-gray-400">Active Battles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">94.2%</div>
            <div className="text-sm text-gray-400">Victory Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {userNation.resources.warPoints.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total War Points</div>
          </div>
        </div>
      </div>
    </div>
  );
}