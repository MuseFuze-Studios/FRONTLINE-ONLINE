import React, { useState, useEffect } from 'react';
import { Map, Save, RotateCcw, Plus, Trash2, Edit3, Eye } from 'lucide-react';
import { apiService } from '../services/api';
import { HexTile } from '../types/game';

interface MapDesignerProps {
  onClose: () => void;
}

export function MapDesigner({ onClose }: MapDesignerProps) {
  const [territories, setTerritories] = useState<HexTile[]>([]);
  const [selectedHex, setSelectedHex] = useState<HexTile | null>(null);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'create'>('view');
  const [newHex, setNewHex] = useState({
    q: 0,
    r: 0,
    nation: 'neutral' as const,
    name: '',
    type: 'land' as const,
    isContested: false,
    underAttack: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTerritories();
  }, []);

  const loadTerritories = async () => {
    try {
      const data = await apiService.getTerritories();
      const hexTiles = data.territories.map((territory: any) => ({
        id: territory.hex_id,
        q: parseInt(territory.hex_id.split('_')[1]) || 0,
        r: parseInt(territory.hex_id.split('_')[2]) || 0,
        nation: territory.controlled_by_nation,
        owner: territory.controlled_by_player,
        isContested: territory.is_contested,
        units: 0,
        underAttack: territory.under_attack,
        name: `Sector ${territory.hex_id.replace('hex_', '').toUpperCase()}`,
        type: 'land' as const
      }));
      setTerritories(hexTiles);
    } catch (error) {
      console.error('Failed to load territories:', error);
    }
  };

  const saveTerritory = async (hex: HexTile) => {
    setLoading(true);
    try {
      await apiService.updateTerritory(hex.id, {
        controlled_by_nation: hex.nation,
        is_contested: hex.isContested,
        under_attack: hex.underAttack
      });
      await loadTerritories();
      setMessage('Territory updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update territory');
      setTimeout(() => setMessage(''), 3000);
    }
    setLoading(false);
  };

  const createTerritory = async () => {
    setLoading(true);
    try {
      const hexId = `hex_${newHex.q}_${newHex.r}`;
      await apiService.createTerritory({
        hex_id: hexId,
        controlled_by_nation: newHex.nation,
        is_contested: newHex.isContested,
        under_attack: newHex.underAttack
      });
      await loadTerritories();
      setNewHex({
        q: 0,
        r: 0,
        nation: 'neutral',
        name: '',
        type: 'land',
        isContested: false,
        underAttack: false
      });
      setEditMode('view');
      setMessage('Territory created successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to create territory');
      setTimeout(() => setMessage(''), 3000);
    }
    setLoading(false);
  };

  const deleteTerritory = async (hexId: string) => {
    if (!confirm('Are you sure you want to delete this territory?')) return;

    setLoading(true);
    try {
      await apiService.deleteTerritory(hexId);
      await loadTerritories();
      setSelectedHex(null);
      setMessage('Territory deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to delete territory');
      setTimeout(() => setMessage(''), 3000);
    }
    setLoading(false);
  };

  const resetMap = async () => {
    if (!confirm('Reset the entire map to balanced faction distribution?')) return;

    setLoading(true);
    try {
      await apiService.resetMap();
      await loadTerritories();
      setMessage('Map reset successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to reset map');
      setTimeout(() => setMessage(''), 3000);
    }
    setLoading(false);
  };

  const nationColors = {
    union: '#3B82F6',
    dominion: '#EF4444',
    syndicate: '#10B981',
    neutral: '#6B7280'
  };

  const getHexColor = (hex: HexTile) => {
    if (hex.underAttack) return '#DC2626';
    if (hex.isContested) return '#F59E0B';
    return nationColors[hex.nation as keyof typeof nationColors] || nationColors.neutral;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Map className="w-5 h-5 mr-2 text-blue-400" />
            Map Designer
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setEditMode('view')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                editMode === 'view' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Eye className="w-3 h-3 inline mr-1" />
              View
            </button>
            <button
              onClick={() => setEditMode('edit')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                editMode === 'edit' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Edit3 className="w-3 h-3 inline mr-1" />
              Edit
            </button>
            <button
              onClick={() => setEditMode('create')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                editMode === 'create' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Plus className="w-3 h-3 inline mr-1" />
              Create
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg border ${
            message.includes('Failed') || message.includes('failed')
              ? 'bg-red-600/20 border-red-600/50 text-red-400'
              : 'bg-green-600/20 border-green-600/50 text-green-400'
          }`}>
            {message}
          </div>
        )}

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Preview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Territory Map</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-300">Union</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-300">Dominion</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-300">Syndicate</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-300">Neutral</span>
                    </div>
                  </div>
                  <button
                    onClick={resetMap}
                    disabled={loading}
                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
                  >
                    <RotateCcw className="w-3 h-3 inline mr-1" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Simplified hex grid display */}
              <div className="bg-blue-900 rounded-lg p-4 min-h-96 relative overflow-auto">
                <div className="grid grid-cols-8 gap-1">
                  {territories.map((hex) => (
                    <button
                      key={hex.id}
                      onClick={() => editMode !== 'create' && setSelectedHex(hex)}
                      className={`w-12 h-12 rounded-lg border-2 transition-all ${
                        selectedHex?.id === hex.id 
                          ? 'border-white scale-110' 
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: getHexColor(hex) }}
                      title={`${hex.name} (${hex.q}, ${hex.r})`}
                    >
                      <div className="text-xs text-white font-bold">
                        {hex.q},{hex.r}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            {editMode === 'create' && (
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4">Create New Territory</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Q Coordinate</label>
                    <input
                      type="number"
                      value={newHex.q}
                      onChange={(e) => setNewHex({ ...newHex, q: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">R Coordinate</label>
                    <input
                      type="number"
                      value={newHex.r}
                      onChange={(e) => setNewHex({ ...newHex, r: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nation</label>
                    <select
                      value={newHex.nation}
                      onChange={(e) => setNewHex({ ...newHex, nation: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="union">Northern Union</option>
                      <option value="dominion">Eastern Dominion</option>
                      <option value="syndicate">Southern Syndicate</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newHex.isContested}
                        onChange={(e) => setNewHex({ ...newHex, isContested: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-300">Contested</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newHex.underAttack}
                        onChange={(e) => setNewHex({ ...newHex, underAttack: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-300">Under Attack</span>
                    </label>
                  </div>
                  <button
                    onClick={createTerritory}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Create Territory
                  </button>
                </div>
              </div>
            )}

            {selectedHex && editMode !== 'create' && (
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {editMode === 'edit' ? 'Edit Territory' : 'Territory Details'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Hex ID</label>
                    <input
                      type="text"
                      value={selectedHex.id}
                      disabled
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Coordinates</label>
                    <input
                      type="text"
                      value={`Q: ${selectedHex.q}, R: ${selectedHex.r}`}
                      disabled
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nation</label>
                    <select
                      value={selectedHex.nation}
                      onChange={(e) => setSelectedHex({ ...selectedHex, nation: e.target.value as any })}
                      disabled={editMode !== 'edit'}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:text-gray-400"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="union">Northern Union</option>
                      <option value="dominion">Eastern Dominion</option>
                      <option value="syndicate">Southern Syndicate</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedHex.isContested}
                        onChange={(e) => setSelectedHex({ ...selectedHex, isContested: e.target.checked })}
                        disabled={editMode !== 'edit'}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-300">Contested</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedHex.underAttack}
                        onChange={(e) => setSelectedHex({ ...selectedHex, underAttack: e.target.checked })}
                        disabled={editMode !== 'edit'}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-300">Under Attack</span>
                    </label>
                  </div>
                  
                  {editMode === 'edit' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => saveTerritory(selectedHex)}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        Save
                      </button>
                      <button
                        onClick={() => deleteTerritory(selectedHex.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-4">Map Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Territories:</span>
                  <span className="text-white">{territories.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Union:</span>
                  <span className="text-blue-400">{territories.filter(t => t.nation === 'union').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Dominion:</span>
                  <span className="text-red-400">{territories.filter(t => t.nation === 'dominion').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Syndicate:</span>
                  <span className="text-green-400">{territories.filter(t => t.nation === 'syndicate').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Neutral:</span>
                  <span className="text-gray-400">{territories.filter(t => t.nation === 'neutral').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Contested:</span>
                  <span className="text-yellow-400">{territories.filter(t => t.isContested).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Under Attack:</span>
                  <span className="text-red-400">{territories.filter(t => t.underAttack).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}