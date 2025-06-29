import React, { useState } from 'react';
import { Building, Factory, Shield, Radar, Package, Wrench, ArrowUp, Home, Wheat, Zap, Users, Archive, Crown, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Building as BuildingType } from '../types/game';
import { BuildQueue } from './BuildQueue';
import { TimerDisplay } from './TimerDisplay';
import { apiService } from '../services/api';

export function BuildMenu() {
  const { state, startBuilding, refreshPlotData } = useGame();
  const plot = state.plot;
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType['type'] | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  if (!plot) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Building className="w-5 h-5 mr-2 text-blue-400" />
          Construction Menu
        </h3>
        <div className="text-center py-8 text-gray-400">
          <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No base data available</p>
          <p className="text-sm mt-1">Please select a nation to establish your base</p>
        </div>
      </div>
    );
  }

  const buildingTypes = [
    {
      type: 'barracks' as BuildingType['type'],
      name: 'Barracks',
      description: 'Train infantry and ground units',
      icon: Shield,
      cost: { materials: 30 },
      time: '2m',
      effects: ['Enables troop training', 'Increases training speed'],
      prerequisites: []
    },
    {
      type: 'industry' as BuildingType['type'],
      name: 'Industrial Complex',
      description: 'Increases material generation rate',
      icon: Factory,
      cost: { materials: 60 },
      time: '5m',
      effects: ['+2 materials/min', 'Unlocks advanced buildings'],
      prerequisites: []
    },
    {
      type: 'farm' as BuildingType['type'],
      name: 'Agricultural Center',
      description: 'Increases food production for troop upkeep',
      icon: Wheat,
      cost: { materials: 35 },
      time: '2.5m',
      effects: ['+3 food/min', 'Reduces troop upkeep costs'],
      prerequisites: []
    },
    {
      type: 'housing' as BuildingType['type'],
      name: 'Housing Complex',
      description: 'Increases population capacity',
      icon: Home,
      cost: { materials: 45 },
      time: '3m',
      effects: ['+25 population cap', 'Enables larger armies'],
      prerequisites: []
    },
    {
      type: 'storage' as BuildingType['type'],
      name: 'Storage Facility',
      description: 'Increases resource storage capacity',
      icon: Archive,
      cost: { materials: 30 },
      time: '2m',
      effects: ['+500 storage cap', 'Prevents resource waste'],
      prerequisites: []
    },
    {
      type: 'infrastructure' as BuildingType['type'],
      name: 'Infrastructure Node',
      description: 'Unlocks access to advanced buildings',
      icon: Zap,
      cost: { materials: 80 },
      time: '6m',
      effects: ['Unlocks tier 2 buildings', 'Improves efficiency'],
      prerequisites: []
    },
    {
      type: 'factory' as BuildingType['type'],
      name: 'Vehicle Factory',
      description: 'Produce armored vehicles and equipment',
      icon: Factory,
      cost: { materials: 40 },
      time: '3m',
      effects: ['Enables vehicle production', 'Faster armor training'],
      prerequisites: ['industry']
    },
    {
      type: 'radar' as BuildingType['type'],
      name: 'Radar Station',
      description: 'Monitor enemy movements and provide intel',
      icon: Radar,
      cost: { materials: 50 },
      time: '4m',
      effects: ['Early warning system', 'Reveals enemy positions'],
      prerequisites: ['infrastructure']
    },
    {
      type: 'federal' as BuildingType['type'],
      name: 'Federal Building',
      description: 'Access government features and national tech',
      icon: Crown,
      cost: { materials: 120 },
      time: '8m',
      effects: ['National tech access', 'Government participation'],
      prerequisites: ['infrastructure']
    }
  ];

  const canAfford = (cost: { materials: number }) => {
    return (plot.resources?.materials || 0) >= cost.materials;
  };

  const hasBuilding = (type: BuildingType['type']) => {
    return (plot.buildings || []).some(b => b.type === type);
  };

  const getBuilding = (type: BuildingType['type']) => {
    return (plot.buildings || []).find(b => b.type === type);
  };

  const isConstructing = () => {
    return (plot.buildQueue || []).length > 0;
  };

  const canUpgrade = (building: BuildingType) => {
    return building.level < building.maxLevel && !building.isUpgrading && !building.isUnderConstruction;
  };

  const getUpgradeCost = (building: BuildingType) => {
    return Math.floor(30 * Math.pow(1.5, building.level));
  };

  const hasPrerequisites = (prerequisites: string[]) => {
    if (prerequisites.length === 0) return true;
    return prerequisites.every(prereq => 
      (plot.buildings || []).some(b => b.type === prereq && !b.isUnderConstruction)
    );
  };

  const handleBuildingClick = async (buildingType: BuildingType['type']) => {
    if (isConstructing()) return;
    
    const success = await startBuilding(buildingType);
    if (success) {
      setSelectedBuilding(null);
    }
  };

  const handleUpgrade = async (buildingId: string) => {
    if (upgrading) return;
    
    setUpgrading(buildingId);
    try {
      const result = await apiService.upgradeBuilding(buildingId);
      if (result.success) {
        await refreshPlotData();
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Building className="w-5 h-5 mr-2 text-blue-400" />
          Construction Menu
          {isConstructing() && (
            <span className="ml-2 px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">
              Building in Progress
            </span>
          )}
        </h3>

        {/* Resource Display */}
        <div className="mb-6 p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Available Materials:</span>
            <span className="text-green-400 font-bold">{plot.resources?.materials || 0}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-gray-300">Population:</span>
            <span className="text-blue-400 font-bold">
              {plot.population?.current || 0} / {plot.population?.cap || 0}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {buildingTypes.map((buildingType) => {
            const affordable = canAfford(buildingType.cost);
            const alreadyBuilt = hasBuilding(buildingType.type);
            const existingBuilding = getBuilding(buildingType.type);
            const hasPrereqs = hasPrerequisites(buildingType.prerequisites);
            const disabled = !affordable || isConstructing() || !hasPrereqs;

            return (
              <div key={buildingType.type} className="space-y-2">
                {/* Build Button */}
                {!alreadyBuilt && (
                  <button
                    onClick={() => !disabled && handleBuildingClick(buildingType.type)}
                    disabled={disabled}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      disabled
                        ? 'bg-gray-700 border-gray-600 opacity-50 cursor-not-allowed'
                        : 'bg-gray-700 border-gray-600 hover:border-blue-500 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <buildingType.icon className={`w-6 h-6 mt-1 ${disabled ? 'text-gray-500' : 'text-blue-400'}`} />
                      <div className="flex-1">
                        <h4 className={`font-medium ${disabled ? 'text-gray-400' : 'text-white'}`}>
                          {buildingType.name}
                        </h4>
                        <p className={`text-sm ${disabled ? 'text-gray-500' : 'text-gray-300'}`}>
                          {buildingType.description}
                        </p>
                        
                        {/* Effects */}
                        <div className="mt-2 space-y-1">
                          {buildingType.effects.map((effect, index) => (
                            <div key={index} className="flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                              <span className="text-xs text-green-400">{effect}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Prerequisites */}
                        {buildingType.prerequisites.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-400">
                              Requires: {buildingType.prerequisites.join(', ')}
                            </div>
                            {!hasPrereqs && (
                              <div className="flex items-center space-x-1 mt-1">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span className="text-xs text-red-400">Prerequisites not met</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Package className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-gray-400">{buildingType.cost.materials} materials</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-gray-400">{buildingType.time}</span>
                          </div>
                        </div>
                        
                        {!affordable && (
                          <div className="mt-2 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span className="text-xs text-red-400">Insufficient materials</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )}

                {/* Existing Building Display */}
                {existingBuilding && (
                  <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <buildingType.icon className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="font-medium text-white">{buildingType.name}</div>
                          <div className="text-sm text-gray-400">Level {existingBuilding.level}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {existingBuilding.isUnderConstruction && (
                          <div className="flex items-center space-x-1">
                            <Wrench className="w-4 h-4 text-yellow-400 animate-spin" />
                            <TimerDisplay 
                              endTime={existingBuilding.constructionEnd} 
                              label="Building"
                              className="text-yellow-400 text-sm"
                            />
                          </div>
                        )}
                        {existingBuilding.isUpgrading && (
                          <div className="flex items-center space-x-1">
                            <ArrowUp className="w-4 h-4 text-blue-400 animate-pulse" />
                            <TimerDisplay 
                              endTime={existingBuilding.upgradeEnd} 
                              label="Upgrading"
                              className="text-blue-400 text-sm"
                            />
                          </div>
                        )}
                        {!existingBuilding.isUnderConstruction && !existingBuilding.isUpgrading && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm">Operational</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Current Effects */}
                    <div className="mb-3 space-y-1">
                      {buildingType.effects.map((effect, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-green-400">{effect}</span>
                        </div>
                      ))}
                    </div>
                    
                    {canUpgrade(existingBuilding) && (
                      <button
                        onClick={() => handleUpgrade(existingBuilding.id)}
                        disabled={upgrading === existingBuilding.id || (plot.resources?.materials || 0) < getUpgradeCost(existingBuilding)}
                        className={`w-full mt-2 px-3 py-2 rounded border text-sm transition-colors ${
                          upgrading === existingBuilding.id
                            ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed'
                            : (plot.resources?.materials || 0) >= getUpgradeCost(existingBuilding)
                            ? 'bg-green-600 border-green-500 text-white hover:bg-green-700'
                            : 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <ArrowUp className="w-3 h-3 inline mr-1" />
                        {upgrading === existingBuilding.id 
                          ? 'Upgrading...' 
                          : `Upgrade to Level ${existingBuilding.level + 1} (${getUpgradeCost(existingBuilding)} materials)`
                        }
                      </button>
                    )}
                    
                    {existingBuilding.level >= existingBuilding.maxLevel && (
                      <div className="mt-2 text-xs text-green-400 text-center">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Maximum Level Reached
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BuildQueue />
    </div>
  );
}