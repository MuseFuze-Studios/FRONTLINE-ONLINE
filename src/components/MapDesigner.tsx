import React, { useState, useEffect } from 'react';
import { Map, Save, RotateCcw, Plus, Trash2, Edit3, Eye, Grid, Layers, Palette, Download, Upload } from 'lucide-react';
import { apiService } from '../services/api';
import { HexTile } from '../types/game';
import { hexToPixel, generateHexPath, HEX_SIZE } from '../utils/hexUtils';

interface MapDesignerProps {
  onClose: () => void;
}

export function MapDesigner({ onClose }: MapDesignerProps) {
  const [territories, setTerritories] = useState<HexTile[]>([]);
  const [selectedHex, setSelectedHex] = useState<HexTile | null>(null);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'create' | 'bulk'>('view');
  const [selectedNation, setSelectedNation] = useState<'neutral' | 'union' | 'dominion' | 'syndicate'>('neutral');
  const [selectedType, setSelectedType] = useState<'land' | 'water' | 'mountain' | 'resource'>('land');
  const [bulkEditMode, setBulkEditMode] = useState<'nation' | 'type' | 'status'>('nation');
  const [selectedHexes, setSelectedHexes] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [undoStack, setUndoStack] = useState<HexTile[][]>([]);

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
      // Save initial state for undo
      setUndoStack([hexTiles]);
    } catch (error) {
      console.error('Failed to load territories:', error);
    }
  };

  const saveState = () => {
    setUndoStack(prev => [...prev.slice(-9), territories]); // Keep last 10 states
  };

  const undo = () => {
    if (undoStack.length > 1) {
      const newStack = [...undoStack];
      newStack.pop(); // Remove current state
      const previousState = newStack[newStack.length - 1];
      setTerritories(previousState);
      setUndoStack(newStack);
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
      setMessage('Territory updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update territory');
      setTimeout(() => setMessage(''), 3000);
    }
    setLoading(false);
  };

  const createTerritory = async (q: number, r: number) => {
    setLoading(true);
    try {
      const hexId = `hex_${q}_${r}`;
      await apiService.createTerritory({
        hex_id: hexId,
        controlled_by_nation: selectedNation,
        is_contested: false,
        under_attack: false
      });
      
      // Add to local state
      const newHex: HexTile = {
        id: hexId,
        q,
        r,
        nation: selectedNation,
        isContested: false,
        units: 0,
        underAttack: false,
        name: `Sector ${hexId.replace('hex_', '').toUpperCase()}`,
        type: selectedType
      };
      
      saveState();
      setTerritories(prev => [...prev, newHex]);
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
      saveState();
      setTerritories(prev => prev.filter(h => h.id !== hexId));
      setSelectedHex(null);
      setMessage('Territory deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to delete territory');
      setTimeout(() => setMessage(''), 3000);
    }
    setLoading(false);
  };

  const bulkEdit = async () => {
    if (selectedHexes.size === 0) return;
    
    setLoading(true);
    saveState();
    
    try {
      const updates = Array.from(selectedHexes).map(async (hexId) => {
        const hex = territories.find(h => h.id === hexId);
        if (!hex) return;
        
        let updateData: any = {};
        
        if (bulkEditMode === 'nation') {
          updateData.controlled_by_nation = selectedNation;
        } else if (bulkEditMode === 'status') {
          updateData.is_contested = false;
          updateData.under_attack = false;
        }
        
        return apiService.updateTerritory(hexId, updateData);
      });
      
      await Promise.all(updates);
      
      // Update local state
      setTerritories(prev => prev.map(hex => {
        if (selectedHexes.has(hex.id)) {
          if (bulkEditMode === 'nation') {
            return { ...hex, nation: selectedNation };
          } else if (bulkEditMode === 'status') {
            return { ...hex, isContested: false, underAttack: false };
          }
        }
        return hex;
      }));
      
      setSelectedHexes(new Set());
      setMessage(`Bulk updated ${selectedHexes.size} territories`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Bulk edit failed');
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

  const handleHexClick = (hex: HexTile, event: React.MouseEvent) => {
    if (editMode === 'bulk') {
      event.stopPropagation();
      const newSelected = new Set(selectedHexes);
      if (newSelected.has(hex.id)) {
        newSelected.delete(hex.id);
      } else {
        newSelected.add(hex.id);
      }
      setSelectedHexes(newSelected);
    } else if (editMode === 'edit') {
      setSelectedHex(hex);
    } else if (editMode === 'create') {
      // Create new hex at clicked position
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      // Convert pixel to hex coordinates (simplified)
      const q = Math.round(x / 60) - 10;
      const r = Math.round(y / 60) - 10;
      createTerritory(q, r);
    }
  };

  const nationColors = {
    union: '#3B82F6',
    dominion: '#EF4444',
    syndicate: '#10B981',
    neutral: '#6B7280'
  };

  const getHexColor = (hex: HexTile) => {
    if (selectedHexes.has(hex.id)) return '#F59E0B'; // Orange for selected
    if (hex.underAttack) return '#DC2626';
    if (hex.isContested) return '#F59E0B';
    return nationColors[hex.nation as keyof typeof nationColors] || nationColors.neutral;
  };

  // Calculate viewBox for the map
  const minX = Math.min(...territories.map(hex => hexToPixel({ q: hex.q, r: hex.r }).x));
  const maxX = Math.max(...territories.map(hex => hexToPixel({ q: hex.q, r: hex.r }).x));
  const minY = Math.min(...territories.map(hex => hexToPixel({ q: hex.q, r: hex.r }).y));
  const maxY = Math.max(...territories.map(hex => hexToPixel({ q: hex.q, r: hex.r }).y));
  
  const padding = HEX_SIZE * 2;
  const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-7xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Map className="w-5 h-5 mr-2 text-blue-400" />
            Advanced Map Designer
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
              onClick={() => setEditMode('bulk')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                editMode === 'bulk' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Layers className="w-3 h-3 inline mr-1" />
              Bulk
            </button>
            <button
              onClick={undo}
              disabled={undoStack.length <= 1}
              className="px-3 py-1 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 rounded text-sm transition-colors"
            >
              ↶ Undo
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

        <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Enhanced Map Preview */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Interactive Territory Map</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`px-2 py-1 rounded text-xs ${showGrid ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    <Grid className="w-3 h-3 inline mr-1" />
                    Grid
                  </button>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                      className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs text-gray-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                      className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                    >
                      +
                    </button>
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

              {/* Enhanced SVG Map */}
              <div className="bg-blue-900 rounded-lg p-4 min-h-96 relative overflow-auto">
                <svg
                  viewBox={viewBox}
                  className="w-full h-96"
                  style={{ 
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                    transform: `scale(${zoom})`
                  }}
                >
                  {/* Grid lines */}
                  {showGrid && (
                    <defs>
                      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
                      </pattern>
                    </defs>
                  )}
                  {showGrid && <rect width="100%" height="100%" fill="url(#grid)" />}
                  
                  {/* Hex tiles */}
                  {territories.map((hex) => {
                    const center = hexToPixel({ q: hex.q, r: hex.r });
                    const path = generateHexPath(center, HEX_SIZE);
                    const color = getHexColor(hex);
                    const isSelected = selectedHex?.id === hex.id;

                    return (
                      <g key={hex.id}>
                        <path
                          d={path}
                          fill={color}
                          fillOpacity={0.7}
                          stroke={isSelected ? "#FFFFFF" : "#374151"}
                          strokeWidth={isSelected ? "3" : "1"}
                          className="cursor-pointer transition-all duration-200 hover:stroke-white hover:stroke-2"
                          onClick={(e) => handleHexClick(hex, e)}
                        />
                        
                        {/* Hex coordinates */}
                        <text
                          x={center.x}
                          y={center.y}
                          textAnchor="middle"
                          className="fill-white text-xs font-bold pointer-events-none"
                          fontSize="8"
                        >
                          {hex.q},{hex.r}
                        </text>
                        
                        {/* Status indicators */}
                        {hex.isContested && (
                          <circle cx={center.x + 15} cy={center.y - 15} r="4" fill="#F59E0B" />
                        )}
                        {hex.underAttack && (
                          <circle cx={center.x - 15} cy={center.y - 15} r="4" fill="#DC2626" />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Enhanced Control Panel */}
          <div className="space-y-4">
            {/* Mode-specific controls */}
            {editMode === 'create' && (
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4">Create New Territory</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nation</label>
                    <select
                      value={selectedNation}
                      onChange={(e) => setSelectedNation(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="union">Northern Union</option>
                      <option value="dominion">Eastern Dominion</option>
                      <option value="syndicate">Southern Syndicate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Terrain Type</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="land">Land</option>
                      <option value="water">Water</option>
                      <option value="mountain">Mountain</option>
                      <option value="resource">Resource Node</option>
                    </select>
                  </div>
                  <div className="text-sm text-gray-400">
                    Click on the map to create new territories
                  </div>
                </div>
              </div>
            )}

            {editMode === 'bulk' && (
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4">Bulk Edit ({selectedHexes.size} selected)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Edit Mode</label>
                    <select
                      value={bulkEditMode}
                      onChange={(e) => setBulkEditMode(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="nation">Change Nation</option>
                      <option value="type">Change Type</option>
                      <option value="status">Reset Status</option>
                    </select>
                  </div>
                  
                  {bulkEditMode === 'nation' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">New Nation</label>
                      <select
                        value={selectedNation}
                        onChange={(e) => setSelectedNation(e.target.value as any)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="neutral">Neutral</option>
                        <option value="union">Northern Union</option>
                        <option value="dominion">Eastern Dominion</option>
                        <option value="syndicate">Southern Syndicate</option>
                      </select>
                    </div>
                  )}
                  
                  <button
                    onClick={bulkEdit}
                    disabled={selectedHexes.size === 0 || loading}
                    className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded transition-colors"
                  >
                    Apply to {selectedHexes.size} territories
                  </button>
                  
                  <button
                    onClick={() => setSelectedHexes(new Set())}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {selectedHex && editMode === 'edit' && (
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4">Edit Territory</h3>
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
                        checked={selectedHex.isContested}
                        onChange={(e) => setSelectedHex({ ...selectedHex, isContested: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-300">Contested</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedHex.underAttack}
                        onChange={(e) => setSelectedHex({ ...selectedHex, underAttack: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-300">Under Attack</span>
                    </label>
                  </div>
                  
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
                </div>
              </div>
            )}

            {/* Enhanced Statistics */}
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-4">Map Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Territories:</span>
                  <span className="text-white font-bold">{territories.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Union:</span>
                  <span className="text-blue-400 font-bold">{territories.filter(t => t.nation === 'union').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Dominion:</span>
                  <span className="text-red-400 font-bold">{territories.filter(t => t.nation === 'dominion').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Syndicate:</span>
                  <span className="text-green-400 font-bold">{territories.filter(t => t.nation === 'syndicate').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Neutral:</span>
                  <span className="text-gray-400 font-bold">{territories.filter(t => t.nation === 'neutral').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Contested:</span>
                  <span className="text-yellow-400 font-bold">{territories.filter(t => t.isContested).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Under Attack:</span>
                  <span className="text-red-400 font-bold">{territories.filter(t => t.underAttack).length}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    saveState();
                    setTerritories(prev => prev.map(hex => ({ ...hex, isContested: false, underAttack: false })));
                  }}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                  Clear All Conflicts
                </button>
                <button
                  onClick={() => {
                    const unionCount = territories.filter(t => t.nation === 'union').length;
                    const dominionCount = territories.filter(t => t.nation === 'dominion').length;
                    const syndicateCount = territories.filter(t => t.nation === 'syndicate').length;
                    alert(`Balance: Union ${unionCount}, Dominion ${dominionCount}, Syndicate ${syndicateCount}`);
                  }}
                  className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                >
                  Check Balance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}