import React, { useState } from 'react';
import { Users, Plane, Target, Truck, Plus, Minus, Heart, Zap, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Troop } from '../types/game';
import { TimerDisplay } from './TimerDisplay';

export function TroopPanel() {
  const { state, startTraining } = useGame();
  const plot = state.plot;
  const [selectedTroop, setSelectedTroop] = useState<Troop['type']>('infantry');
  const [quantity, setQuantity] = useState(1);

  if (!plot) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-red-400" />
          Military Training
        </h3>
        <div className="text-center py-8 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No base data available</p>
          <p className="text-sm mt-1">Please select a nation to establish your base</p>
        </div>
      </div>
    );
  }

  const troopTypes = [
    {
      type: 'infantry' as Troop['type'],
      name: 'Infantry Squad',
      description: 'Basic ground forces with rifles and equipment',
      icon: Users,
      cost: { manpower: 15 },
      time: '1m',
      strength: 1,
      upkeep: { food: 1, fuel: 0 },
      effects: ['Versatile combat unit', 'Low maintenance cost']
    },
    {
      type: 'armor' as Troop['type'],
      name: 'Armor Unit',
      description: 'Heavy tanks and armored vehicles',
      icon: Truck,
      cost: { manpower: 25 },
      time: '2m',
      strength: 3,
      upkeep: { food: 0, fuel: 1 },
      effects: ['High combat strength', 'Requires fuel upkeep']
    },
    {
      type: 'artillery' as Troop['type'],
      name: 'Artillery Battery',
      description: 'Long-range fire support and siege weapons',
      icon: Target,
      cost: { manpower: 35 },
      time: '3m',
      strength: 5,
      upkeep: { food: 1, fuel: 1 },
      effects: ['Devastating firepower', 'High upkeep costs']
    },
    {
      type: 'air' as Troop['type'],
      name: 'Air Squadron',
      description: 'Fighter and bomber aircraft',
      icon: Plane,
      cost: { manpower: 50 },
      time: '4m',
      strength: 7,
      upkeep: { food: 0, fuel: 2 },
      effects: ['Superior combat power', 'Very high fuel consumption']
    }
  ];

  const selectedTroopData = troopTypes.find(t => t.type === selectedTroop)!;
  const totalCost = selectedTroopData.cost.manpower * quantity;
  const totalUpkeepFood = selectedTroopData.upkeep.food * quantity;
  const totalUpkeepFuel = selectedTroopData.upkeep.fuel * quantity;
  
  const canAfford = (plot.resources?.manpower || 0) >= totalCost;
  const hasPopulationSpace = (plot.population?.current || 0) + quantity <= (plot.population?.cap || 0);
  const hasBarracks = (plot.buildings || []).some(b => b.type === 'barracks' && !b.isUnderConstruction);
  const isTraining = (plot.troops || []).some(t => t.isTraining);

  const handleTraining = async () => {
    if (canAfford && hasPopulationSpace && hasBarracks && !isTraining) {
      await startTraining(selectedTroop, quantity);
      setQuantity(1);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2 text-red-400" />
        Military Training
        {isTraining && (
          <span className="ml-2 px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">
            Training in Progress
          </span>
        )}
      </h3>

      {!hasBarracks ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-2 text-gray-500" />
          <p className="text-gray-400 mb-2">Barracks required for training</p>
          <p className="text-sm text-gray-500">Construct a barracks to train military units</p>
        </div>
      ) : (
        <>
          {/* Resource Display */}
          <div className="mb-6 p-3 bg-gray-700 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Manpower:</span>
                <span className="text-blue-400 font-bold">{plot.resources?.manpower || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Population:</span>
                <span className="text-purple-400 font-bold">
                  {plot.population?.current || 0} / {plot.population?.cap || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Food:</span>
                <span className="text-green-400 font-bold">{plot.resources?.food || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Fuel:</span>
                <span className="text-red-400 font-bold">{plot.resources?.fuel || 0}</span>
              </div>
            </div>
          </div>

          {/* Troop Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Unit Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {troopTypes.map((troop) => (
                <button
                  key={troop.type}
                  onClick={() => setSelectedTroop(troop.type)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedTroop === troop.type
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <troop.icon className="w-4 h-4" />
                    <div>
                      <div className="font-medium text-sm">{troop.name}</div>
                      <div className="text-xs opacity-75">
                        {troop.cost.manpower} MP | Str: {troop.strength}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity
            </label>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Minus className="w-4 h-4 text-gray-300" />
              </button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setQuantity(Math.min(20, quantity + 1))}
                className="p-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Training Details */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <selectedTroopData.icon className="w-6 h-6 text-red-400 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-white">{selectedTroopData.name}</h4>
                <p className="text-sm text-gray-400 mb-3">{selectedTroopData.description}</p>
                
                {/* Effects */}
                <div className="mb-3 space-y-1">
                  {selectedTroopData.effects.map((effect, index) => (
                    <div key={index} className="flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">{effect}</span>
                    </div>
                  ))}
                </div>
                
                {/* Costs and Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Cost:</span>
                      <span className={canAfford ? 'text-blue-400' : 'text-red-400'}>
                        {totalCost} Manpower
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Training Time:</span>
                      <span className="text-gray-300">{selectedTroopData.time} per unit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Combat Strength:</span>
                      <span className="text-yellow-400">{selectedTroopData.strength * quantity}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Food Upkeep:</span>
                      <span className="text-green-400">{totalUpkeepFood}/hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fuel Upkeep:</span>
                      <span className="text-red-400">{totalUpkeepFuel}/hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Population Used:</span>
                      <span className={hasPopulationSpace ? 'text-purple-400' : 'text-red-400'}>
                        {quantity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          <div className="mb-4 space-y-2">
            {!canAfford && (
              <div className="flex items-center space-x-2 p-2 bg-red-600/20 border border-red-600/50 rounded">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">Insufficient manpower</span>
              </div>
            )}
            {!hasPopulationSpace && (
              <div className="flex items-center space-x-2 p-2 bg-red-600/20 border border-red-600/50 rounded">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">Population capacity exceeded</span>
              </div>
            )}
            {totalUpkeepFood > (plot.resources?.food || 0) && (
              <div className="flex items-center space-x-2 p-2 bg-yellow-600/20 border border-yellow-600/50 rounded">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm">Warning: Insufficient food for upkeep</span>
              </div>
            )}
            {totalUpkeepFuel > (plot.resources?.fuel || 0) && (
              <div className="flex items-center space-x-2 p-2 bg-yellow-600/20 border border-yellow-600/50 rounded">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm">Warning: Insufficient fuel for upkeep</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleTraining}
            disabled={!canAfford || !hasPopulationSpace || isTraining}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              !canAfford || !hasPopulationSpace || isTraining
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isTraining
              ? 'Training in Progress...'
              : !canAfford
              ? 'Insufficient Manpower'
              : !hasPopulationSpace
              ? 'Population Capacity Full'
              : `Begin Training (${quantity} units)`
            }
          </button>

          {/* Current Troops Display */}
          {plot.troops && plot.troops.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-white mb-3">Current Forces</h4>
              <div className="space-y-2">
                {plot.troops.map((troop) => (
                  <div key={troop.id} className="p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-red-400" />
                        <div>
                          <div className="font-medium text-white">{troop.name}</div>
                          <div className="text-sm text-gray-400">
                            Count: {troop.count} | Strength: {troop.strength * troop.count}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Morale indicator */}
                        <div className="flex items-center space-x-1">
                          <Heart className={`w-3 h-3 ${
                            troop.morale >= 80 ? 'text-green-400' :
                            troop.morale >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`} />
                          <span className={`text-xs ${
                            troop.morale >= 80 ? 'text-green-400' :
                            troop.morale >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {troop.morale}%
                          </span>
                        </div>
                        
                        {/* Status indicator */}
                        {troop.isTraining ? (
                          <TimerDisplay 
                            endTime={troop.trainingEnd} 
                            label="Training"
                            className="text-yellow-400 text-xs"
                          />
                        ) : troop.isDeployed ? (
                          <div className="flex items-center space-x-1">
                            <Zap className="w-3 h-3 text-blue-400" />
                            <span className="text-blue-400 text-xs">Deployed</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 text-xs">Ready</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Upkeep display */}
                    <div className="mt-2 flex items-center space-x-4 text-xs">
                      {troop.upkeepFood > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-400">Food:</span>
                          <span className="text-green-400">{troop.upkeepFood}/hr</span>
                        </div>
                      )}
                      {troop.upkeepFuel > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-400">Fuel:</span>
                          <span className="text-red-400">{troop.upkeepFuel}/hr</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}