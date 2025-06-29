import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Target, Users, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';
import { useGame } from '../context/GameContext';

interface PlayerAction {
  id: string;
  playerId: number;
  actionType: 'move' | 'attack' | 'occupy';
  fromHex?: string;
  toHex: string;
  troopData: any;
  startedAt: number;
  completesAt: number;
  status: 'in_progress' | 'completed' | 'cancelled';
}

export function UnitMovementTracker() {
  const { state } = useGame();
  const [playerActions, setPlayerActions] = useState<PlayerAction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlayerActions();
    const interval = setInterval(loadPlayerActions, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPlayerActions = async () => {
    try {
      const data = await apiService.getPlayerActions();
      setPlayerActions(data.actions || []);
    } catch (error) {
      console.error('Failed to load player actions:', error);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getTimeRemaining = (completesAt: number) => {
    const remaining = completesAt - Date.now();
    return remaining > 0 ? remaining : 0;
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'move': return MapPin;
      case 'attack': return Target;
      case 'occupy': return Users;
      default: return MapPin;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'move': return 'text-blue-400';
      case 'attack': return 'text-red-400';
      case 'occupy': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const myActions = playerActions.filter(action => action.playerId === state.user?.id);
  const otherActions = playerActions.filter(action => 
    action.playerId !== state.user?.id && 
    action.status === 'in_progress'
  );

  return (
    <div className="space-y-6">
      {/* My Unit Movements */}
      {myActions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-400" />
            Your Unit Operations
          </h3>
          <div className="space-y-3">
            {myActions.map(action => {
              const ActionIcon = getActionIcon(action.actionType);
              const actionColor = getActionColor(action.actionType);
              const timeRemaining = getTimeRemaining(action.completesAt);
              const progress = Math.max(0, Math.min(100, 
                ((Date.now() - action.startedAt) / (action.completesAt - action.startedAt)) * 100
              ));

              return (
                <div key={action.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <ActionIcon className={`w-5 h-5 ${actionColor}`} />
                      <div>
                        <div className="font-medium text-white capitalize">
                          {action.actionType} Operation
                        </div>
                        <div className="text-sm text-gray-400">
                          {action.fromHex && (
                            <>
                              {state.hexMap.find(h => h.id === action.fromHex)?.name || action.fromHex}
                              <ArrowRight className="w-3 h-3 inline mx-2" />
                            </>
                          )}
                          {state.hexMap.find(h => h.id === action.toHex)?.name || action.toHex}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {action.status === 'in_progress' ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 text-sm">
                            {formatTime(timeRemaining)}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-sm px-2 py-1 rounded ${
                          action.status === 'completed' ? 'bg-green-600 text-green-100' :
                          'bg-gray-600 text-gray-100'
                        }`}>
                          {action.status}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {action.status === 'in_progress' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            action.actionType === 'attack' ? 'bg-red-400' :
                            action.actionType === 'occupy' ? 'bg-green-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {action.troopData && (
                    <div className="mt-2 text-xs text-gray-400">
                      Forces: {action.troopData.totalUnits || 'Unknown'} units
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detected Enemy Movements */}
      {otherActions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-red-400" />
            Detected Enemy Activity
          </h3>
          <div className="space-y-3">
            {otherActions.slice(0, 5).map(action => {
              const ActionIcon = getActionIcon(action.actionType);
              const actionColor = getActionColor(action.actionType);
              const timeRemaining = getTimeRemaining(action.completesAt);

              return (
                <div key={action.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <ActionIcon className={`w-4 h-4 ${actionColor}`} />
                      <div>
                        <div className="text-sm font-medium text-white capitalize">
                          {action.actionType} detected
                        </div>
                        <div className="text-xs text-gray-400">
                          Target: {state.hexMap.find(h => h.id === action.toHex)?.name || 'Unknown sector'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-yellow-400">
                      ETA: {formatTime(timeRemaining)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myActions.length === 0 && otherActions.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
          <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-2 opacity-50" />
          <p className="text-gray-400">No unit movements detected</p>
          <p className="text-sm text-gray-500 mt-1">Deploy troops to see movement tracking</p>
        </div>
      )}
    </div>
  );
}