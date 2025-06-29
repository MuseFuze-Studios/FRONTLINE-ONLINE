import React, { useState } from 'react';
import { Truck, Package, Users, AlertTriangle, Send, ArrowRight, Clock } from 'lucide-react';
import { useGame } from '../context/GameContext';

export function SupplyPanel() {
  const { state, sendSupplyConvoy, requestSupply } = useGame();
  const plot = state.plot;
  const [selectedResource, setSelectedResource] = useState<'manpower' | 'materials' | 'fuel' | 'food'>('materials');
  const [amount, setAmount] = useState(10);
  const [targetPlotId, setTargetPlotId] = useState('');
  const [mode, setMode] = useState<'send' | 'request'>('request');

  if (!plot) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Truck className="w-5 h-5 mr-2 text-green-400" />
          Supply Operations
        </h3>
        <div className="text-center py-8 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No base data available</p>
        </div>
      </div>
    );
  }

  const resourceIcons = {
    manpower: Users,
    materials: Package,
    fuel: Truck,
    food: Package
  };

  const resourceColors = {
    manpower: 'text-blue-400',
    materials: 'text-green-400',
    fuel: 'text-red-400',
    food: 'text-yellow-400'
  };

  const canAfford = (plot.resources[selectedResource] || 0) >= amount;

  const handleSendSupply = async () => {
    if (mode === 'send' && targetPlotId && canAfford) {
      await sendSupplyConvoy(targetPlotId, selectedResource, amount);
    } else if (mode === 'request') {
      await requestSupply(selectedResource, amount);
    }
  };

  const ResourceIcon = resourceIcons[selectedResource];

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Truck className="w-5 h-5 mr-2 text-green-400" />
        Supply Operations
      </h3>

      {/* Resource Specialization Notice */}
      <div className="mb-6 p-4 bg-purple-600/20 border border-purple-600/50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Package className="w-4 h-4 text-purple-400" />
          <span className="text-purple-400 font-medium">Resource Specialization</span>
        </div>
        <p className="text-sm text-gray-300">
          Your base specializes in <span className="text-purple-400 font-medium">{plot.resourceSpecialization}</span> production.
          Trade with other players or request supplies from your nation for other resources.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('request')}
            className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
              mode === 'request'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
            }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Request Supply
          </button>
          <button
            onClick={() => setMode('send')}
            className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
              mode === 'send'
                ? 'bg-green-600 border-green-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
            }`}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            Send Convoy
          </button>
        </div>
      </div>

      {/* Resource Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Resource Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(resourceIcons).map(([resource, Icon]) => (
            <button
              key={resource}
              onClick={() => setSelectedResource(resource as any)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedResource === resource
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Icon className="w-4 h-4" />
                <div>
                  <div className="font-medium text-sm capitalize">{resource}</div>
                  <div className="text-xs opacity-75">
                    Available: {plot.resources[resource as keyof typeof plot.resources] || 0}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Amount
        </label>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAmount(Math.max(1, amount - 10))}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >
            -10
          </button>
          <input
            type="number"
            min="1"
            max="1000"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setAmount(Math.min(1000, amount + 10))}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >
            +10
          </button>
        </div>
      </div>

      {/* Target Plot (for sending) */}
      {mode === 'send' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Base ID
          </label>
          <input
            type="text"
            value={targetPlotId}
            onChange={(e) => setTargetPlotId(e.target.value)}
            placeholder="Enter target base ID"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Supply Details */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <div className="flex items-start space-x-3">
          <ResourceIcon className={`w-6 h-6 ${resourceColors[selectedResource]} mt-1`} />
          <div className="flex-1">
            <h4 className="font-medium text-white capitalize">{selectedResource} {mode === 'send' ? 'Convoy' : 'Request'}</h4>
            <p className="text-sm text-gray-400 mb-3">
              {mode === 'send' 
                ? `Send ${amount} ${selectedResource} to another base`
                : `Request ${amount} ${selectedResource} from your nation`
              }
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className={resourceColors[selectedResource]}>{amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Available:</span>
                  <span className="text-white">{plot.resources[selectedResource] || 0}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Transit Time:</span>
                  <span className="text-gray-300">5-15 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Level:</span>
                  <span className="text-yellow-400">Medium</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      <div className="mb-4 space-y-2">
        {mode === 'send' && !canAfford && (
          <div className="flex items-center space-x-2 p-2 bg-red-600/20 border border-red-600/50 rounded">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">Insufficient {selectedResource}</span>
          </div>
        )}
        {mode === 'send' && !targetPlotId && (
          <div className="flex items-center space-x-2 p-2 bg-yellow-600/20 border border-yellow-600/50 rounded">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm">Target base ID required</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handleSendSupply}
        disabled={mode === 'send' && (!canAfford || !targetPlotId)}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          mode === 'send' && (!canAfford || !targetPlotId)
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : mode === 'send'
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {mode === 'send' ? (
          <>
            <Truck className="w-4 h-4 inline mr-2" />
            Send Supply Convoy
          </>
        ) : (
          <>
            <Send className="w-4 h-4 inline mr-2" />
            Request from Nation
          </>
        )}
      </button>

      {/* Active Convoys */}
      {state.convoys && state.convoys.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-white mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-blue-400" />
            Active Supply Operations
          </h4>
          <div className="space-y-2">
            {state.convoys.map((convoy) => (
              <div key={convoy.id} className="p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-green-400" />
                    <div>
                      <div className="font-medium text-white capitalize">
                        {convoy.amount} {convoy.resourceType}
                      </div>
                      <div className="text-sm text-gray-400">
                        Status: {convoy.status}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className={`px-2 py-1 rounded text-xs ${
                      convoy.status === 'in_transit' ? 'bg-blue-600 text-blue-100' :
                      convoy.status === 'delivered' ? 'bg-green-600 text-green-100' :
                      convoy.status === 'intercepted' ? 'bg-red-600 text-red-100' :
                      'bg-gray-600 text-gray-100'
                    }`}>
                      {convoy.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supply Chain Info */}
      <div className="mt-6 p-3 bg-blue-600/20 border border-blue-600/50 rounded-lg">
        <h4 className="text-blue-400 font-medium mb-2">Supply Chain Strategy</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Convoys can be intercepted by enemy forces</li>
          <li>• Longer routes have higher risk but better rewards</li>
          <li>• Coordinate with allies for protected supply lines</li>
          <li>• National supply requests have guaranteed delivery</li>
        </ul>
      </div>
    </div>
  );
}