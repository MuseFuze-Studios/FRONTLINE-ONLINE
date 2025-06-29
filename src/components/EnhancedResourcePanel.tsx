import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Zap, Users, Wheat, Truck, Archive, AlertTriangle, Clock, Activity, MousePointer, Gift } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { apiService } from '../services/api';

export function EnhancedResourcePanel() {
  const { state, refreshPlotData } = useGame();
  const plot = state.plot;
  const [resourceTrends, setResourceTrends] = useState({
    manpower: { trend: 'up', rate: 0 },
    materials: { trend: 'up', rate: 0 },
    fuel: { trend: 'up', rate: 0 },
    food: { trend: 'up', rate: 0 }
  });
  const [collecting, setCollecting] = useState(false);
  const [lastCollected, setLastCollected] = useState(0);
  const [collectableAmount, setCollectableAmount] = useState({
    manpower: 0,
    materials: 0,
    fuel: 0,
    food: 0
  });

  useEffect(() => {
    if (!plot) return;

    // Calculate production rates
    const industryCount = plot.buildings.filter(b => b.type === 'industry' && !b.isUnderConstruction).length;
    const farmCount = plot.buildings.filter(b => b.type === 'farm' && !b.isUnderConstruction).length;
    const storageCount = plot.buildings.filter(b => b.type === 'storage' && !b.isUnderConstruction).length;

    // IMPROVED BASE RATES per hour - FOOD SIGNIFICANTLY BOOSTED
    let manpowerRate = plot.resourceSpecialization === 'manpower' ? 24 : 8;
    let materialsRate = (plot.resourceSpecialization === 'materials' ? 24 : 8) + (industryCount * 8);
    let fuelRate = plot.resourceSpecialization === 'fuel' ? 12 : 4;
    let foodRate = (plot.resourceSpecialization === 'food' ? 36 : 12) + (farmCount * 12); // TRIPLED food rates

    // Calculate upkeep
    const totalUpkeep = plot.troops.reduce((acc, troop) => ({
      food: acc.food + troop.upkeepFood,
      fuel: acc.fuel + troop.upkeepFuel
    }), { food: 0, fuel: 0 });

    // Net rates
    foodRate -= totalUpkeep.food;
    fuelRate -= totalUpkeep.fuel;

    setResourceTrends({
      manpower: { trend: manpowerRate > 0 ? 'up' : 'down', rate: Math.abs(manpowerRate) },
      materials: { trend: materialsRate > 0 ? 'up' : 'down', rate: Math.abs(materialsRate) },
      fuel: { trend: fuelRate > 0 ? 'up' : 'down', rate: Math.abs(fuelRate) },
      food: { trend: foodRate > 0 ? 'up' : 'down', rate: Math.abs(foodRate) }
    });

    // Calculate collectable amounts (15% of current resources, minimum 10)
    setCollectableAmount({
      manpower: Math.max(10, Math.floor(plot.resources.manpower * 0.15)),
      materials: Math.max(10, Math.floor(plot.resources.materials * 0.15)),
      fuel: Math.max(10, Math.floor(plot.resources.fuel * 0.15)),
      food: Math.max(10, Math.floor(plot.resources.food * 0.15))
    });
  }, [plot]);

  const handleCollectResources = async () => {
    if (!plot || collecting || Date.now() - lastCollected < 300000) return; // 5 minute cooldown
    
    setCollecting(true);
    try {
      const result = await apiService.collectResources();
      if (result.success) {
        await refreshPlotData();
        setLastCollected(Date.now());
        // Show success animation or notification
        console.log('Resources collected:', result.collected);
      }
    } catch (error) {
      console.error('Failed to collect resources:', error);
    } finally {
      setCollecting(false);
    }
  };

  const canCollect = !collecting && (Date.now() - lastCollected >= 300000); // 5 minute cooldown
  const cooldownRemaining = Math.max(0, 300000 - (Date.now() - lastCollected));

  if (!plot) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2 text-yellow-400" />
          Enhanced Resource Status
        </h3>
        <div className="text-center py-8 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No base data available</p>
        </div>
      </div>
    );
  }

  const storageCount = plot.buildings.filter(b => b.type === 'storage' && !b.isUnderConstruction).length;
  const housingCount = plot.buildings.filter(b => b.type === 'housing' && !b.isUnderConstruction).length;
  const storageCap = 1500 + (storageCount * 750); // INCREASED storage capacity
  const populationCap = 50 + (housingCount * 25);

  const resources = [
    {
      name: 'Manpower',
      icon: Users,
      value: plot.resources.manpower,
      max: storageCap,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400',
      trend: resourceTrends.manpower,
      specialization: plot.resourceSpecialization === 'manpower',
      collectable: collectableAmount.manpower
    },
    {
      name: 'Materials',
      icon: Package,
      value: plot.resources.materials,
      max: storageCap,
      color: 'text-green-400',
      bgColor: 'bg-green-400',
      trend: resourceTrends.materials,
      specialization: plot.resourceSpecialization === 'materials',
      collectable: collectableAmount.materials
    },
    {
      name: 'Fuel',
      icon: Zap,
      value: plot.resources.fuel,
      max: storageCap,
      color: 'text-red-400',
      bgColor: 'bg-red-400',
      trend: resourceTrends.fuel,
      specialization: plot.resourceSpecialization === 'fuel',
      collectable: collectableAmount.fuel
    },
    {
      name: 'Food',
      icon: Wheat,
      value: plot.resources.food,
      max: storageCap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400',
      trend: resourceTrends.food,
      specialization: plot.resourceSpecialization === 'food',
      collectable: collectableAmount.food
    }
  ];

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Package className="w-5 h-5 mr-2 text-yellow-400" />
        Enhanced Resource Status
        <div className="ml-auto flex items-center space-x-2">
          <Activity className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm">Live Production</span>
        </div>
      </h3>

      {/* Interactive Resource Collection */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-600/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Gift className="w-6 h-6 text-green-400" />
            <div>
              <h4 className="font-semibold text-green-400">Resource Collection Available</h4>
              <p className="text-sm text-gray-300">
                Collect bonus resources from your base operations
              </p>
            </div>
          </div>
          <button
            onClick={handleCollectResources}
            disabled={!canCollect}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              canCollect
                ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {collecting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Collecting...</span>
              </div>
            ) : !canCollect && cooldownRemaining > 0 ? (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{formatTime(cooldownRemaining)}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <MousePointer className="w-4 h-4" />
                <span>Collect Resources</span>
              </div>
            )}
          </button>
        </div>
        
        {canCollect && (
          <div className="grid grid-cols-4 gap-2 text-xs">
            {resources.map((resource) => (
              <div key={resource.name} className="text-center p-2 bg-gray-700/50 rounded">
                <resource.icon className={`w-4 h-4 mx-auto mb-1 ${resource.color}`} />
                <div className={`font-bold ${resource.color}`}>+{resource.collectable}</div>
                <div className="text-gray-400">{resource.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resource Specialization Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-600/50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Truck className="w-6 h-6 text-purple-400" />
          <div>
            <h4 className="font-semibold text-purple-400">Resource Specialization</h4>
            <p className="text-sm text-gray-300">
              This base specializes in <span className="text-purple-400 font-medium capitalize">{plot.resourceSpecialization}</span> production (+4x rate)
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Resource Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {resources.map((resource) => {
          const percentage = Math.min(100, (resource.value / resource.max) * 100);
          const isNearFull = percentage > 90;
          const isLow = percentage < 20;
          
          return (
            <div key={resource.name} className={`p-4 rounded-lg border transition-all hover:scale-105 ${
              resource.specialization 
                ? 'bg-purple-600/20 border-purple-600/50' 
                : 'bg-gray-700 border-gray-600'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <resource.icon className={`w-5 h-5 ${resource.color}`} />
                  <span className="font-medium text-white">{resource.name}</span>
                  {resource.specialization && (
                    <span className="px-2 py-1 bg-purple-600 text-purple-100 text-xs rounded">SPEC</span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className={`w-3 h-3 ${
                    resource.trend.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  } ${resource.trend.trend === 'up' ? '' : 'rotate-180'}`} />
                  <span className={`text-xs ${
                    resource.trend.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {resource.trend.rate}/hr
                  </span>
                </div>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm">
                  <span className={`font-bold ${resource.color}`}>
                    {resource.value.toLocaleString()}
                  </span>
                  <span className="text-gray-400">
                    {resource.max.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${resource.bgColor} ${
                      isNearFull ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
              
              {isNearFull && (
                <div className="flex items-center space-x-1 text-xs text-yellow-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Storage Nearly Full</span>
                </div>
              )}
              
              {isLow && resource.trend.trend === 'down' && (
                <div className="flex items-center space-x-1 text-xs text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Running Low</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Infrastructure Info */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-600">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Archive className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Storage Capacity</span>
          </div>
          <div className="text-lg font-bold text-purple-400">{storageCap.toLocaleString()}</div>
          <div className="text-xs text-gray-500">+{storageCount * 750} from storage buildings</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Users className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Population</span>
          </div>
          <div className="text-lg font-bold text-orange-400">
            {plot.population?.current || 0} / {populationCap}
          </div>
          <div className="text-xs text-gray-500">+{housingCount * 25} from housing</div>
        </div>
      </div>

      {/* Enhanced Production Efficiency */}
      <div className="mt-4 p-3 bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Production Efficiency</span>
          <span className="text-sm text-green-400">
            {Math.min(100, Math.floor((
              plot.buildings.filter(b => !b.isUnderConstruction).length * 10 +
              (plot.population?.current || 0) * 2 +
              (plot.resourceSpecialization ? 20 : 0)
            ) / 2))}%
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div 
            className="bg-green-400 h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.min(100, Math.floor((
                plot.buildings.filter(b => !b.isUnderConstruction).length * 10 +
                (plot.population?.current || 0) * 2 +
                (plot.resourceSpecialization ? 20 : 0)
              ) / 2))}%` 
            }}
          ></div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Based on infrastructure, population, and specialization
        </div>
      </div>
    </div>
  );
}