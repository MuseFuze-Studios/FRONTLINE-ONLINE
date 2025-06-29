import React from 'react';
import { Heart, Shield, Sword, Users, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useGame } from '../context/GameContext';

export function MoraleSystem() {
  const { state } = useGame();
  const plot = state.plot;

  if (!plot || !plot.troops || plot.troops.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-red-400" />
          Troop Morale System
        </h3>
        <div className="text-center py-8 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No troops to monitor</p>
          <p className="text-sm mt-1">Train troops to see morale status</p>
        </div>
      </div>
    );
  }

  // Calculate overall morale factors
  const totalTroops = plot.troops.reduce((sum, troop) => sum + troop.count, 0);
  const avgMorale = totalTroops > 0 
    ? Math.round(plot.troops.reduce((sum, troop) => sum + (troop.morale * troop.count), 0) / totalTroops)
    : 100;

  // Calculate upkeep status
  const totalUpkeep = plot.troops.reduce((acc, troop) => ({
    food: acc.food + troop.upkeepFood,
    fuel: acc.fuel + troop.upkeepFuel
  }), { food: 0, fuel: 0 });

  const foodSupplied = plot.resources.food >= totalUpkeep.food;
  const fuelSupplied = plot.resources.fuel >= totalUpkeep.fuel;
  const wellSupplied = foodSupplied && fuelSupplied;

  // Morale factors
  const moraleFactors = [
    {
      name: 'Supply Status',
      icon: Shield,
      status: wellSupplied ? 'positive' : 'negative',
      impact: wellSupplied ? '+2/hr' : '-5/hr',
      description: wellSupplied ? 'All troops well supplied' : 'Insufficient supplies'
    },
    {
      name: 'Combat Readiness',
      icon: Sword,
      status: avgMorale > 70 ? 'positive' : avgMorale > 40 ? 'neutral' : 'negative',
      impact: avgMorale > 70 ? '+10% damage' : avgMorale > 40 ? 'Normal' : '-20% damage',
      description: `Average morale: ${avgMorale}%`
    },
    {
      name: 'Population Pressure',
      icon: Users,
      status: (plot.population?.current || 0) < (plot.population?.cap || 50) * 0.8 ? 'positive' : 'negative',
      impact: (plot.population?.current || 0) < (plot.population?.cap || 50) * 0.8 ? 'Stable' : '-1/hr',
      description: `${plot.population?.current || 0}/${plot.population?.cap || 50} population`
    }
  ];

  const getMoraleColor = (morale: number) => {
    if (morale >= 80) return 'text-green-400';
    if (morale >= 60) return 'text-yellow-400';
    if (morale >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getMoraleBarColor = (morale: number) => {
    if (morale >= 80) return 'bg-green-400';
    if (morale >= 60) return 'bg-yellow-400';
    if (morale >= 40) return 'bg-orange-400';
    return 'bg-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Heart className="w-5 h-5 mr-2 text-red-400" />
        Troop Morale System
        <div className="ml-auto flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            avgMorale >= 70 ? 'bg-green-400' : 
            avgMorale >= 40 ? 'bg-yellow-400' : 'bg-red-400'
          }`}></div>
          <span className={`text-sm font-medium ${getMoraleColor(avgMorale)}`}>
            {avgMorale}% Average
          </span>
        </div>
      </h3>

      {/* Overall Morale Status */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-medium">Overall Morale</span>
          <span className={`font-bold ${getMoraleColor(avgMorale)}`}>{avgMorale}%</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getMoraleBarColor(avgMorale)}`}
            style={{ width: `${avgMorale}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-400">
          {avgMorale >= 80 ? 'Excellent - troops fight with maximum effectiveness' :
           avgMorale >= 60 ? 'Good - troops perform well in combat' :
           avgMorale >= 40 ? 'Fair - some combat penalties apply' :
           'Poor - significant combat penalties and desertion risk'}
        </div>
      </div>

      {/* Morale Factors */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-white mb-3">Morale Factors</h4>
        <div className="space-y-3">
          {moraleFactors.map((factor, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <factor.icon className={`w-5 h-5 ${
                  factor.status === 'positive' ? 'text-green-400' :
                  factor.status === 'negative' ? 'text-red-400' : 'text-yellow-400'
                }`} />
                <div>
                  <div className="font-medium text-white">{factor.name}</div>
                  <div className="text-sm text-gray-400">{factor.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-medium ${
                  factor.status === 'positive' ? 'text-green-400' :
                  factor.status === 'negative' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {factor.impact}
                </div>
                <div className="flex items-center space-x-1">
                  {factor.status === 'positive' ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : factor.status === 'negative' ? (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  ) : (
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Troop Morale */}
      <div>
        <h4 className="text-md font-semibold text-white mb-3">Unit Morale Status</h4>
        <div className="space-y-2">
          {plot.troops.map((troop) => (
            <div key={troop.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-medium text-white">{troop.name}</div>
                  <div className="text-sm text-gray-400">
                    {troop.count} units • Strength: {troop.strength * troop.count}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className={`font-medium ${getMoraleColor(troop.morale)}`}>
                    {troop.morale}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {troop.morale >= 80 ? 'Excellent' :
                     troop.morale >= 60 ? 'Good' :
                     troop.morale >= 40 ? 'Fair' : 'Poor'}
                  </div>
                </div>
                <div className="w-16 bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getMoraleBarColor(troop.morale)}`}
                    style={{ width: `${troop.morale}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {!wellSupplied && (
        <div className="mt-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium">Supply Crisis</span>
          </div>
          <div className="text-sm text-gray-300 mt-1">
            Troops are not receiving adequate supplies. Morale will continue to decline until supply issues are resolved.
            {!foodSupplied && ` Need ${totalUpkeep.food - plot.resources.food} more food.`}
            {!fuelSupplied && ` Need ${totalUpkeep.fuel - plot.resources.fuel} more fuel.`}
          </div>
        </div>
      )}

      {avgMorale <= 30 && (
        <div className="mt-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium">Desertion Risk</span>
          </div>
          <div className="text-sm text-gray-300 mt-1">
            Extremely low morale may cause troops to desert. Improve supply conditions immediately.
          </div>
        </div>
      )}
    </div>
  );
}