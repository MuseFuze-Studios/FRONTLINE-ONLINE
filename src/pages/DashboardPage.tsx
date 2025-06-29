import React, { useState } from 'react';
import { Activity, Users, MapPin, AlertTriangle, TrendingUp, Send, Globe, Package } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { DeploymentModal } from '../components/DeploymentModal';
import { apiService } from '../services/api';

export function DashboardPage() {
  const { state, refreshPlotData } = useGame();
  const { user, plot, nations } = state;
  const [showDeployment, setShowDeployment] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const userNation = nations.find(n => n.id === user?.nation);

  const stats = [
    {
      title: 'Base Status',
      value: plot ? 'Operational' : 'Establishing',
      icon: Activity,
      color: 'text-green-400',
      bg: 'bg-green-400/10'
    },
    {
      title: 'Military Units',
      value: plot ? plot.troops.reduce((sum, troop) => sum + troop.count, 0) : 0,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10'
    },
    {
      title: 'Nation Territories',
      value: userNation?.territories || 0,
      icon: MapPin,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10'
    },
    {
      title: 'Active Battles',
      value: state.battles.filter(b => b.status === 'ongoing').length,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-400/10'
    }
  ];

  const recentActivity = [
    { time: '2 minutes ago', action: 'Infantry training completed', type: 'success' },
    { time: '15 minutes ago', action: 'Barracks construction finished', type: 'info' },
    { time: '1 hour ago', action: 'Resources collected', type: 'success' },
    { time: '2 hours ago', action: 'Territory Alpha under attack', type: 'warning' }
  ];

  const handleCollectResources = async () => {
    if (!plot || collecting) return;
    
    setCollecting(true);
    try {
      const result = await apiService.collectResources();
      if (result.success) {
        await refreshPlotData();
        // Show success message or notification
        console.log('Resources collected:', result.collected);
      }
    } catch (error) {
      console.error('Failed to collect resources:', error);
      // Show error message
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, Commander {user?.username}</h1>
            <p className="opacity-90">
              {userNation ? `${userNation.name} Command Center` : 'Command Center'}
              {user?.role === 'admin' && (
                <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded">ADMIN</span>
              )}
            </p>
            {plot && (
              <div className="mt-2 text-sm opacity-75">
                Base Location: {state.hexMap.find(h => h.id === plot.hexId)?.name || 'Unknown'}
              </div>
            )}
          </div>
          <TrendingUp className="w-12 h-12 opacity-75" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'success' ? 'bg-green-400' :
                  activity.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                }`}></div>
                <div className="flex-1">
                  <p className="text-white text-sm">{activity.action}</p>
                  <p className="text-gray-400 text-xs">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => setShowDeployment(true)}
              disabled={!plot || plot.troops.filter(t => !t.isTraining && !t.isDeployed && t.count > 0).length === 0}
              className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-left"
            >
              <div className="flex items-center">
                <Send className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">Deploy Troops</div>
                  <div className="text-sm opacity-90">Send forces to battlefront</div>
                </div>
              </div>
            </button>
            
            <button 
              onClick={handleCollectResources}
              disabled={!plot || collecting}
              className="w-full p-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-left"
            >
              <div className="flex items-center">
                <Package className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">
                    {collecting ? 'Collecting...' : 'Collect Resources'}
                  </div>
                  <div className="text-sm opacity-90">Gather materials and supplies</div>
                </div>
              </div>
            </button>
            
            <button className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-left">
              <div className="font-medium">View Intelligence</div>
              <div className="text-sm opacity-90">Check enemy movements</div>
            </button>
          </div>
        </div>
      </div>

      {/* World Status */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-green-400" />
          World Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">{state.hexMap.length}</div>
            <div className="text-sm text-gray-400">Total Sectors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {state.hexMap.filter(h => h.nation === 'neutral').length}
            </div>
            <div className="text-sm text-gray-400">Neutral Zones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {state.hexMap.filter(h => h.isContested || h.underAttack).length}
            </div>
            <div className="text-sm text-gray-400">Contested Areas</div>
          </div>
        </div>
      </div>

      <DeploymentModal 
        isOpen={showDeployment} 
        onClose={() => setShowDeployment(false)} 
      />
    </div>
  );
}