import React, { useState, useEffect } from 'react';
import { Truck, MapPin, AlertTriangle, Shield, Zap, Clock, Package, Route } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface SupplyRoute {
  id: string;
  from: string;
  to: string;
  distance: number;
  status: 'secure' | 'threatened' | 'cut';
  lastUpdate: number;
}

export function SupplyLineSystem() {
  const { state } = useGame();
  const plot = state.plot;
  const [supplyRoutes, setSupplyRoutes] = useState<SupplyRoute[]>([]);
  const [supplyStatus, setSupplyStatus] = useState<'connected' | 'isolated' | 'threatened'>('connected');

  useEffect(() => {
    if (!plot) return;

    // Calculate supply routes to friendly territories
    const friendlyTerritories = state.hexMap.filter(hex => 
      hex.nation === state.user?.nation && hex.id !== plot.hexId
    );

    const routes: SupplyRoute[] = friendlyTerritories.slice(0, 3).map((territory, index) => ({
      id: `route_${index}`,
      from: plot.hexId,
      to: territory.id,
      distance: Math.floor(Math.random() * 10) + 1,
      status: Math.random() > 0.7 ? 'threatened' : 'secure',
      lastUpdate: Date.now()
    }));

    setSupplyRoutes(routes);

    // Determine overall supply status
    if (routes.length === 0) {
      setSupplyStatus('isolated');
    } else if (routes.some(r => r.status === 'cut') || routes.filter(r => r.status === 'secure').length < 2) {
      setSupplyStatus('threatened');
    } else {
      setSupplyStatus('connected');
    }
  }, [plot, state.hexMap, state.user?.nation]);

  if (!plot) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Route className="w-5 h-5 mr-2 text-green-400" />
          Supply Line Network
        </h3>
        <div className="text-center py-8 text-gray-400">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No base data available</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'threatened': return 'text-yellow-400';
      case 'isolated': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'secure': return Shield;
      case 'threatened': return AlertTriangle;
      case 'cut': return AlertTriangle;
      default: return MapPin;
    }
  };

  const supplyEfficiency = supplyStatus === 'connected' ? 100 : 
                          supplyStatus === 'threatened' ? 60 : 25;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Route className="w-5 h-5 mr-2 text-green-400" />
        Supply Line Network
        <div className="ml-auto flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            supplyStatus === 'connected' ? 'bg-green-400' :
            supplyStatus === 'threatened' ? 'bg-yellow-400' : 'bg-red-400'
          }`}></div>
          <span className={`text-sm font-medium ${getStatusColor(supplyStatus)}`}>
            {supplyStatus.charAt(0).toUpperCase() + supplyStatus.slice(1)}
          </span>
        </div>
      </h3>

      {/* Supply Status Overview */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-medium">Supply Efficiency</span>
          <span className={`font-bold ${getStatusColor(supplyStatus)}`}>{supplyEfficiency}%</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              supplyStatus === 'connected' ? 'bg-green-400' :
              supplyStatus === 'threatened' ? 'bg-yellow-400' : 'bg-red-400'
            }`}
            style={{ width: `${supplyEfficiency}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-400">
          {supplyStatus === 'connected' ? 'All supply routes operational - maximum resource generation' :
           supplyStatus === 'threatened' ? 'Some routes compromised - reduced efficiency' :
           'Supply lines cut - minimal resource generation'}
        </div>
      </div>

      {/* Supply Routes */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-white mb-3">Active Supply Routes</h4>
        {supplyRoutes.length > 0 ? (
          <div className="space-y-3">
            {supplyRoutes.map((route) => {
              const StatusIcon = getStatusIcon(route.status);
              const targetHex = state.hexMap.find(h => h.id === route.to);
              
              return (
                <div key={route.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <StatusIcon className={`w-5 h-5 ${
                      route.status === 'secure' ? 'text-green-400' :
                      route.status === 'threatened' ? 'text-yellow-400' : 'text-red-400'
                    }`} />
                    <div>
                      <div className="font-medium text-white">
                        Route to {targetHex?.name || 'Unknown Sector'}
                      </div>
                      <div className="text-sm text-gray-400">
                        Distance: {route.distance} sectors • Status: {route.status}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${
                      route.status === 'secure' ? 'text-green-400' :
                      route.status === 'threatened' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {route.status === 'secure' ? '100%' :
                       route.status === 'threatened' ? '60%' : '0%'}
                    </div>
                    <div className="text-xs text-gray-400">Efficiency</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-red-400 font-medium">No Supply Routes</p>
            <p className="text-sm mt-1">Your base is isolated from friendly territory</p>
          </div>
        )}
      </div>

      {/* Supply Effects */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-white mb-3">Supply Line Effects</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <Package className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <div className="text-sm text-gray-400">Resource Generation</div>
            <div className={`font-bold ${getStatusColor(supplyStatus)}`}>
              {supplyEfficiency}%
            </div>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <Truck className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <div className="text-sm text-gray-400">Reinforcement Speed</div>
            <div className={`font-bold ${getStatusColor(supplyStatus)}`}>
              {supplyStatus === 'connected' ? 'Normal' :
               supplyStatus === 'threatened' ? 'Slow' : 'Blocked'}
            </div>
          </div>
        </div>
      </div>

      {/* Convoy System */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-white mb-3">Supply Convoys</h4>
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white">Next Convoy Arrival</span>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400">
                {Math.floor(Math.random() * 30) + 5} minutes
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Expected cargo: {Math.floor(Math.random() * 100) + 50} materials, 
            {Math.floor(Math.random() * 50) + 25} fuel
          </div>
          <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
            <div className="bg-blue-400 h-2 rounded-full animate-pulse" style={{ width: '35%' }}></div>
          </div>
        </div>
      </div>

      {/* Warnings and Recommendations */}
      {supplyStatus === 'isolated' && (
        <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium">Supply Crisis</span>
          </div>
          <div className="text-sm text-gray-300">
            Your base is completely cut off from supply lines. Resource generation is severely limited.
            Capture adjacent territories to restore supply connections.
          </div>
        </div>
      )}

      {supplyStatus === 'threatened' && (
        <div className="p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-medium">Supply Lines Threatened</span>
          </div>
          <div className="text-sm text-gray-300">
            Enemy forces are threatening your supply routes. Secure additional territories or 
            reinforce existing routes to maintain full efficiency.
          </div>
        </div>
      )}

      {supplyStatus === 'connected' && (
        <div className="p-3 bg-green-600/20 border border-green-600/50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-medium">Supply Lines Secure</span>
          </div>
          <div className="text-sm text-gray-300">
            All supply routes are operational. Your base is receiving maximum resource generation 
            and reinforcement support.
          </div>
        </div>
      )}
    </div>
  );
}