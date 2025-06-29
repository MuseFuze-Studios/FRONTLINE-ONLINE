import React from 'react';
import { Building, Wrench, Users, Package, Zap, TrendingUp, AlertTriangle, Crown, Wheat, Home, Archive } from 'lucide-react';
import { useGame } from '../context/GameContext';

export function PlotPanel() {
  const { state } = useGame();
  const plot = state.plot;

  if (!plot) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center py-8 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No base data available</p>
          <p className="text-sm mt-1">Please select a nation to establish your base</p>
        </div>
      </div>
    );
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getTimeRemaining = (endTime: number) => {
    const remaining = endTime - Date.now();
    return remaining > 0 ? remaining : 0;
  };

  // Calculate resource production rates
  const industryCount = plot.buildings.filter(b => b.type === 'industry' && !b.isUnderConstruction).length;
  const farmCount = plot.buildings.filter(b => b.type === 'farm' && !b.isUnderConstruction).length;
  const storageCount = plot.buildings.filter(b => b.type === 'storage' && !b.isUnderConstruction).length;
  const housingCount = plot.buildings.filter(b => b.type === 'housing' && !b.isUnderConstruction).length;

  const productionRates = {
    manpower: plot.resourceSpecialization === 'manpower' ? 6 : 2,
    materials: (plot.resourceSpecialization === 'materials' ? 6 : 2) + (industryCount * 2),
    fuel: plot.resourceSpecialization === 'fuel' ? 3 : 1,
    food: (plot.resourceSpecialization === 'food' ? 3 : 1) + (farmCount * 3)
  };

  const storageCap = 1000 + (storageCount * 500);
  const populationCap = 50 + (housingCount * 25);

  // Calculate total upkeep
  const totalUpkeep = plot.troops.reduce((acc, troop) => ({
    food: acc.food + troop.upkeepFood,
    fuel: acc.fuel + troop.upkeepFuel
  }), { food: 0, fuel: 0 });

  const getSpecializationIcon = (type: string) => {
    switch (type) {
      case 'manpower': return Users;
      case 'materials': return Building;
      case 'fuel': return Zap;
      case 'food': return Wheat;
      default: return Package;
    }
  };

  const SpecializationIcon = getSpecializationIcon(plot.resourceSpecialization);

  return (
    <div className="space-y-6">
      {/* Resource Specialization Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 text-white">
        <div className="flex items-center space-x-3">
          <SpecializationIcon className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Resource Specialization</h3>
            <p className="text-sm opacity-90">
              This base specializes in {plot.resourceSpecialization} production (+3x rate)
            </p>
          </div>
        </div>
      </div>

      {/* Resource Status */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2 text-yellow-400" />
          Resource Status
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{plot.resources.manpower || 0}</div>
            <div className="text-sm text-gray-400">Manpower</div>
            <div className="text-xs text-green-400 mt-1">+{productionRates.manpower}/hr</div>
            <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
              <div 
                className="bg-blue-400 h-1 rounded-full" 
                style={{ width: `${Math.min(100, (plot.resources.manpower / storageCap) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{plot.resources.materials || 0}</div>
            <div className="text-sm text-gray-400">Materials</div>
            <div className="text-xs text-green-400 mt-1">+{productionRates.materials}/hr</div>
            <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
              <div 
                className="bg-green-400 h-1 rounded-full" 
                style={{ width: `${Math.min(100, (plot.resources.materials / storageCap) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-red-400">{plot.resources.fuel || 0}</div>
            <div className="text-sm text-gray-400">Fuel</div>
            <div className="text-xs text-green-400 mt-1">+{productionRates.fuel}/hr</div>
            <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
              <div 
                className="bg-red-400 h-1 rounded-full" 
                style={{ width: `${Math.min(100, (plot.resources.fuel / storageCap) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{plot.resources.food || 0}</div>
            <div className="text-sm text-gray-400">Food</div>
            <div className="text-xs text-green-400 mt-1">+{productionRates.food}/hr</div>
            <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
              <div 
                className="bg-yellow-400 h-1 rounded-full" 
                style={{ width: `${Math.min(100, (plot.resources.food / storageCap) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Storage and Population Info */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-600">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Archive className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-400">Storage Capacity</span>
            </div>
            <div className="text-lg font-bold text-purple-400">{storageCap.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Home className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-gray-400">Population</span>
            </div>
            <div className="text-lg font-bold text-orange-400">
              {plot.population?.current || 0} / {populationCap}
            </div>
          </div>
        </div>

        {/* Upkeep Warning */}
        {(totalUpkeep.food > 0 || totalUpkeep.fuel > 0) && (
          <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Troop Upkeep</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Food consumption:</span>
                <span className={`font-medium ${
                  totalUpkeep.food > plot.resources.food ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  -{totalUpkeep.food}/hr
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Fuel consumption:</span>
                <span className={`font-medium ${
                  totalUpkeep.fuel > plot.resources.fuel ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  -{totalUpkeep.fuel}/hr
                </span>
              </div>
            </div>
            {(totalUpkeep.food > plot.resources.food || totalUpkeep.fuel > plot.resources.fuel) && (
              <div className="mt-2 text-xs text-red-400">
                ⚠️ Insufficient resources for upkeep! Troop morale will decline.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Infrastructure Panel */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Building className="w-5 h-5 mr-2 text-blue-400" />
          Infrastructure ({plot.buildings?.length || 0})
        </h3>
        <div className="space-y-3">
          {plot.buildings && plot.buildings.length > 0 ? (
            plot.buildings.map((building) => {
              const getBuildingIcon = (type: string) => {
                switch (type) {
                  case 'headquarters': return Crown;
                  case 'barracks': return Users;
                  case 'industry': return Building;
                  case 'farm': return Wheat;
                  case 'housing': return Home;
                  case 'storage': return Archive;
                  case 'infrastructure': return Zap;
                  case 'federal': return Crown;
                  default: return Building;
                }
              };

              const BuildingIcon = getBuildingIcon(building.type);

              return (
                <div key={building.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BuildingIcon className="w-5 h-5 text-blue-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{building.name}</div>
                          <div className="text-sm text-gray-400">Level {building.level}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {building.isUnderConstruction ? (
                            <div className="flex items-center space-x-2">
                              <Wrench className="w-4 h-4 text-yellow-400 animate-spin" />
                              <span className="text-yellow-400 text-sm">
                                {building.constructionEnd && formatTime(getTimeRemaining(building.constructionEnd))}
                              </span>
                            </div>
                          ) : building.isUpgrading ? (
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4 text-blue-400 animate-pulse" />
                              <span className="text-blue-400 text-sm">Upgrading</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-green-400 text-sm">Operational</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Building specific effects */}
                      <div className="mt-2 text-xs text-gray-500">
                        {building.type === 'headquarters' && 'Command and control center'}
                        {building.type === 'barracks' && 'Enables troop training'}
                        {building.type === 'industry' && `+${building.level * 2} materials/hr`}
                        {building.type === 'farm' && `+${building.level * 3} food/hr`}
                        {building.type === 'housing' && `+${building.level * 25} population cap`}
                        {building.type === 'storage' && `+${building.level * 500} storage cap`}
                        {building.type === 'infrastructure' && 'Unlocks advanced buildings'}
                        {building.type === 'federal' && 'Government access'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No structures built</p>
              <p className="text-sm mt-1">Use the construction menu to build your first structure</p>
            </div>
          )}
        </div>
      </div>

      {/* Military Forces Panel */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-red-400" />
          Military Forces
        </h3>
        {plot.troops && plot.troops.length > 0 ? (
          <div className="space-y-3">
            {plot.troops.map((troop) => (
              <div key={troop.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{troop.name}</div>
                      <div className="text-sm text-gray-400">
                        Count: {troop.count || 0} | Strength: {(troop.strength || 0) * (troop.count || 0)} | Morale: {troop.morale || 100}%
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {troop.isTraining ? (
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-yellow-400 animate-pulse" />
                          <span className="text-yellow-400 text-sm">
                            {troop.trainingEnd && formatTime(getTimeRemaining(troop.trainingEnd))}
                          </span>
                        </div>
                      ) : troop.isDeployed ? (
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
                          <span className="text-blue-400 text-sm">Deployed</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 text-sm">Ready</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Upkeep display */}
                  {(troop.upkeepFood > 0 || troop.upkeepFuel > 0) && (
                    <div className="mt-2 flex items-center space-x-4 text-xs">
                      {troop.upkeepFood > 0 && (
                        <span className="text-green-400">Food: -{troop.upkeepFood}/hr</span>
                      )}
                      {troop.upkeepFuel > 0 && (
                        <span className="text-red-400">Fuel: -{troop.upkeepFuel}/hr</span>
                      )}
                    </div>
                  )}
                  
                  {/* Deployment status */}
                  {troop.isDeployed && troop.targetHex && (
                    <div className="mt-2 text-xs text-blue-400">
                      Deployed to: {state.hexMap.find(h => h.id === troop.targetHex)?.name || 'Unknown'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No military units deployed</p>
            <p className="text-sm mt-1">Build a barracks to train troops</p>
          </div>
        )}
      </div>
    </div>
  );
}