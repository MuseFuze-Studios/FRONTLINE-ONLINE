import React from 'react';
import { Building, Wrench, X, Clock } from 'lucide-react';
import { useGame } from '../context/GameContext';

export function BuildQueue() {
  const { state, cancelConstruction } = useGame();
  const plot = state.plot;

  console.log('BuildQueue - Plot:', plot);
  console.log('BuildQueue - BuildQueue:', plot?.buildQueue);

  if (!plot || !plot.buildQueue || plot.buildQueue.length === 0) {
    return null;
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

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h4 className="text-md font-semibold text-white mb-3 flex items-center">
        <Building className="w-4 h-4 mr-2 text-blue-400" />
        Construction Queue ({plot.buildQueue.length})
      </h4>
      
      <div className="space-y-2">
        {plot.buildQueue.map((building, index) => (
          <div key={building.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                  #{index + 1}
                </span>
                <Wrench className="w-4 h-4 text-yellow-400 animate-spin" />
              </div>
              <div>
                <div className="font-medium text-white">{building.name}</div>
                <div className="text-sm text-gray-400">
                  {building.isUpgrading ? `Upgrading to Level ${building.level + 1}` : 'Construction'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {building.constructionEnd && (
                <div className="flex items-center space-x-1 text-yellow-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-sm">
                    {formatTime(getTimeRemaining(building.constructionEnd))}
                  </span>
                </div>
              )}
              
              {building.canCancel && (
                <button
                  onClick={() => cancelConstruction(building.id)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded transition-colors"
                  title="Cancel construction"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}