import React, { useState, useEffect } from 'react';
import { Shield, Settings, RotateCcw, Trash2, Globe, Sliders, Users, Database, Map } from 'lucide-react';
import { apiService } from '../services/api';
import { MapDesigner } from './MapDesigner';

interface GameSettings {
  resourceGenerationRate: number;
  populationGrowthRate: number;
  maxTroopCapacity: number;
  constructionTimeModifier: number;
  moraleDropRate: number;
  moraleRecoveryRate: number;
}

export function AdminPanel() {
  const [settings, setSettings] = useState<GameSettings>({
    resourceGenerationRate: 1.0,
    populationGrowthRate: 1.0,
    maxTroopCapacity: 1000,
    constructionTimeModifier: 1.0,
    moraleDropRate: 1.0,
    moraleRecoveryRate: 1.0
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showMapDesigner, setShowMapDesigner] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiService.getAdminSettings();
      setSettings(data.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSettings = async () => {
    setLoading(true);
    try {
      await apiService.updateAdminSettings(settings);
      setMessage('Settings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update settings');
      setTimeout(() => setMessage(''), 3000);
    }
    setLoading(false);
  };

  const performSoftWipe = async () => {
    if (!confirm('⚠️ SOFT WIPE CONFIRMATION\n\nThis will:\n• Reset all player resources\n• Remove all buildings (except HQ)\n• Remove all troops\n• Reset territories to neutral\n\nPlayer accounts will remain. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      await apiService.performSoftWipe();
      setMessage('Soft wipe completed successfully');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage('Soft wipe failed');
      setTimeout(() => setMessage(''), 5000);
    }
    setLoading(false);
  };

  const performHardWipe = async () => {
    if (!confirm('🚨 HARD WIPE CONFIRMATION\n\nThis will:\n• DELETE ALL PLAYER ACCOUNTS\n• DELETE ALL GAME DATA\n• Keep only admin accounts\n• Recreate AI players\n\nTHIS CANNOT BE UNDONE! Continue?')) {
      return;
    }

    const secondConfirm = prompt('Type "DELETE EVERYTHING" to confirm hard wipe:');
    if (secondConfirm !== 'DELETE EVERYTHING') {
      return;
    }

    setLoading(true);
    try {
      await apiService.performHardWipe();
      setMessage('Hard wipe completed successfully');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage('Hard wipe failed');
      setTimeout(() => setMessage(''), 5000);
    }
    setLoading(false);
  };

  const resetMap = async () => {
    if (!confirm('🗺️ MAP RESET CONFIRMATION\n\nThis will:\n• Reset all territories\n• Evenly distribute control between factions\n• Remove all contested areas\n• Create balanced starting positions\n\nContinue?')) {
      return;
    }

    setLoading(true);
    try {
      await apiService.resetMap();
      setMessage('Map reset completed with even distribution');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage('Map reset failed');
      setTimeout(() => setMessage(''), 5000);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Admin Control Panel</h1>
            <p className="opacity-90">Manage game settings and perform administrative actions</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.includes('failed') || message.includes('Failed')
            ? 'bg-red-600/20 border-red-600/50 text-red-400'
            : 'bg-green-600/20 border-green-600/50 text-green-400'
        }`}>
          {message}
        </div>
      )}

      {/* Game Settings */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Sliders className="w-5 h-5 mr-2 text-blue-400" />
          Game Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resource Generation Rate
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5.0"
              value={settings.resourceGenerationRate}
              onChange={(e) => setSettings({
                ...settings,
                resourceGenerationRate: parseFloat(e.target.value)
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Multiplier for all resource generation (1.0 = normal)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Population Growth Rate
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5.0"
              value={settings.populationGrowthRate}
              onChange={(e) => setSettings({
                ...settings,
                populationGrowthRate: parseFloat(e.target.value)
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Rate of population growth per cycle</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Troop Capacity
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              value={settings.maxTroopCapacity}
              onChange={(e) => setSettings({
                ...settings,
                maxTroopCapacity: parseInt(e.target.value)
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Maximum troops per player</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Construction Time Modifier
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5.0"
              value={settings.constructionTimeModifier}
              onChange={(e) => setSettings({
                ...settings,
                constructionTimeModifier: parseFloat(e.target.value)
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Multiplier for construction times (0.5 = faster)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Morale Drop Rate
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5.0"
              value={settings.moraleDropRate}
              onChange={(e) => setSettings({
                ...settings,
                moraleDropRate: parseFloat(e.target.value)
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Rate of morale loss when unsupplied</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Morale Recovery Rate
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5.0"
              value={settings.moraleRecoveryRate}
              onChange={(e) => setSettings({
                ...settings,
                moraleRecoveryRate: parseFloat(e.target.value)
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Rate of morale recovery when well-supplied</p>
          </div>
        </div>

        <button
          onClick={updateSettings}
          disabled={loading}
          className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4 inline mr-2" />
          {loading ? 'Updating...' : 'Update Settings'}
        </button>
      </div>

      {/* Administrative Actions */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-red-400" />
          Administrative Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={performSoftWipe}
            disabled={loading}
            className="p-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <RotateCcw className="w-5 h-5 mr-2" />
              <span className="font-medium">Soft Wipe</span>
            </div>
            <p className="text-sm opacity-90">
              Reset resources, buildings, and troops. Keep player accounts.
            </p>
          </button>

          <button
            onClick={resetMap}
            disabled={loading}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <Globe className="w-5 h-5 mr-2" />
              <span className="font-medium">Reset Map</span>
            </div>
            <p className="text-sm opacity-90">
              Reset territories with even faction distribution. No contested areas.
            </p>
          </button>

          <button
            onClick={() => setShowMapDesigner(true)}
            className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <Map className="w-5 h-5 mr-2" />
              <span className="font-medium">Map Designer</span>
            </div>
            <p className="text-sm opacity-90">
              Visually design and edit the world map territories.
            </p>
          </button>

          <button
            onClick={performHardWipe}
            disabled={loading}
            className="p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-left border-2 border-red-500"
          >
            <div className="flex items-center mb-2">
              <Trash2 className="w-5 h-5 mr-2" />
              <span className="font-medium">Hard Wipe</span>
            </div>
            <p className="text-sm opacity-90">
              ⚠️ DELETE ALL player accounts and data. IRREVERSIBLE!
            </p>
          </button>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-green-400" />
          System Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">3</div>
            <div className="text-sm text-gray-400">AI Players per Faction</div>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-green-400">3min</div>
            <div className="text-sm text-gray-400">Resource Generation Cycle</div>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">50</div>
            <div className="text-sm text-gray-400">Max Building Level</div>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">10s</div>
            <div className="text-sm text-gray-400">Real-time Update Interval</div>
          </div>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-400 mb-1">Administrator Responsibilities</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Use administrative powers responsibly</li>
              <li>• Always confirm with players before major resets</li>
              <li>• Monitor game balance and adjust settings as needed</li>
              <li>• Hard wipes should only be used for major updates or critical issues</li>
              <li>• Use the Map Designer to create balanced and engaging territories</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Map Designer Modal */}
      {showMapDesigner && (
        <MapDesigner onClose={() => setShowMapDesigner(false)} />
      )}
    </div>
  );
}