import React, { useState } from 'react';
import { X, Send, Users, Target } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { HexTile, Troop } from '../types/game';
import { HexMap } from './HexMap';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeploymentModal({ isOpen, onClose }: DeploymentModalProps) {
  const { state, deployTroops } = useGame();
  const [selectedTroops, setSelectedTroops] = useState<{ [key: string]: number }>({});
  const [targetHex, setTargetHex] = useState<HexTile | null>(null);
  const [deploymentType, setDeploymentType] = useState<'attack' | 'reinforce'>('attack');

  if (!isOpen || !state.plot) return null;

  const availableTroops = state.plot.troops.filter(t => !t.isTraining && !t.isDeployed && t.count > 0);

  const handleTroopSelection = (troopId: string, count: number) => {
    setSelectedTroops(prev => ({
      ...prev,
      [troopId]: Math.max(0, count)
    }));
  };

  const handleHexSelect = (hex: HexTile) => {
    if (hex.nation === state.user?.nation && deploymentType === 'attack') return;
    setTargetHex(hex);
  };

  const handleDeploy = () => {
    if (!targetHex) return;

    const troopsToDeployment = Object.entries(selectedTroops)
      .filter(([_, count]) => count > 0)
      .map(([troopId, count]) => ({ troopId, count }));

    if (troopsToDeployment.length === 0) return;

    deployTroops(troopsToDeployment, targetHex.id, deploymentType);
    onClose();
    setSelectedTroops({});
    setTargetHex(null);
  };

  const totalSelectedTroops = Object.values(selectedTroops).reduce((sum, count) => sum + count, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Send className="w-5 h-5 mr-2 text-blue-400" />
            Deploy Troops
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Deployment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mission Type
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setDeploymentType('attack')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  deploymentType === 'attack'
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                <Target className="w-4 h-4 inline mr-2" />
                Attack
              </button>
              <button
                onClick={() => setDeploymentType('reinforce')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  deploymentType === 'reinforce'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Reinforce
              </button>
            </div>
          </div>

          {/* Troop Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Troops
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableTroops.map((troop) => (
                <div key={troop.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-white">{troop.name}</div>
                      <div className="text-sm text-gray-400">Available: {troop.count}</div>
                    </div>
                    <div className="text-sm text-blue-400">
                      Strength: {troop.strength * (selectedTroops[troop.id] || 0)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max={troop.count}
                      value={selectedTroops[troop.id] || 0}
                      onChange={(e) => handleTroopSelection(troop.id, parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max={troop.count}
                      value={selectedTroops[troop.id] || 0}
                      onChange={(e) => handleTroopSelection(troop.id, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Target Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Target ({deploymentType === 'attack' ? 'Enemy Territory' : 'Friendly Territory'})
            </label>
            <HexMap
              onHexClick={handleHexSelect}
              selectedHex={targetHex?.id}
              deploymentMode={true}
            />
            {targetHex && (
              <div className="mt-2 p-3 bg-gray-700 rounded-lg">
                <div className="font-medium text-white">Target: {targetHex.name}</div>
                <div className="text-sm text-gray-400">
                  Nation: {targetHex.nation} | Units: {targetHex.units}
                </div>
              </div>
            )}
          </div>

          {/* Deploy Button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Total troops selected: {totalSelectedTroops}
            </div>
            <button
              onClick={handleDeploy}
              disabled={!targetHex || totalSelectedTroops === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !targetHex || totalSelectedTroops === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Deploy Troops
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}