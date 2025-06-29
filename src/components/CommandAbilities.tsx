import React, { useState } from 'react';
import { Zap, Eye, TrendingUp, Users, MapPin, Clock, Star, Crown } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface CommandAbility {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  cost: number;
  cooldown: number;
  duration?: number;
  requirements: string[];
  effect: string;
  lastUsed?: number;
}

export function CommandAbilities() {
  const { state } = useGame();
  const user = state.user;
  const plot = state.plot;
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  // Command abilities based on role and nation
  const abilities: CommandAbility[] = [
    {
      id: 'recon_sweep',
      name: 'Reconnaissance Sweep',
      description: 'Reveal enemy unit positions and movements in a large area',
      icon: Eye,
      cost: 50,
      cooldown: 300000, // 5 minutes
      duration: 120000, // 2 minutes
      requirements: ['Radar Station'],
      effect: 'Reveals enemy positions within 5 hexes for 2 minutes'
    },
    {
      id: 'force_march',
      name: 'Forced March',
      description: 'Increase troop movement speed by 50% for all units',
      icon: Users,
      cost: 75,
      cooldown: 600000, // 10 minutes
      duration: 180000, // 3 minutes
      requirements: ['Barracks Level 2+'],
      effect: 'All troop movements 50% faster for 3 minutes'
    },
    {
      id: 'production_boost',
      name: 'Production Surge',
      description: 'Double resource generation rate for a short period',
      icon: TrendingUp,
      cost: 100,
      cooldown: 900000, // 15 minutes
      duration: 300000, // 5 minutes
      requirements: ['Industry Building'],
      effect: 'Double all resource generation for 5 minutes'
    },
    {
      id: 'supply_drop',
      name: 'Emergency Supply Drop',
      description: 'Instantly receive emergency supplies at any location',
      icon: MapPin,
      cost: 125,
      cooldown: 1200000, // 20 minutes
      requirements: ['Federal Building'],
      effect: 'Instantly gain 200 of each resource'
    }
  ];

  // Add admin-only abilities
  if (user?.role === 'admin') {
    abilities.push(
      {
        id: 'orbital_strike',
        name: 'Orbital Strike',
        description: 'Devastating attack that can destroy enemy positions',
        icon: Zap,
        cost: 200,
        cooldown: 1800000, // 30 minutes
        requirements: ['Admin Access'],
        effect: 'Instantly capture any enemy territory'
      },
      {
        id: 'global_boost',
        name: 'Nation-wide Boost',
        description: 'Boost all players in your nation for a significant duration',
        icon: Crown,
        cost: 300,
        cooldown: 3600000, // 1 hour
        duration: 1800000, // 30 minutes
        requirements: ['Admin Access'],
        effect: 'All nation players get +50% resource generation for 30 minutes'
      }
    );
  }

  const canUseAbility = (ability: CommandAbility) => {
    if (!plot) return false;
    
    // Check command points (using materials as command points for now)
    if (plot.resources.materials < ability.cost) return false;
    
    // Check cooldown
    if (ability.lastUsed && Date.now() - ability.lastUsed < ability.cooldown) return false;
    
    // Check requirements
    for (const requirement of ability.requirements) {
      if (requirement === 'Admin Access' && user?.role !== 'admin') return false;
      if (requirement === 'Radar Station' && !plot.buildings.some(b => b.type === 'radar' && !b.isUnderConstruction)) return false;
      if (requirement === 'Barracks Level 2+' && !plot.buildings.some(b => b.type === 'barracks' && b.level >= 2 && !b.isUnderConstruction)) return false;
      if (requirement === 'Industry Building' && !plot.buildings.some(b => b.type === 'industry' && !b.isUnderConstruction)) return false;
      if (requirement === 'Federal Building' && !plot.buildings.some(b => b.type === 'federal' && !b.isUnderConstruction)) return false;
    }
    
    return true;
  };

  const getCooldownRemaining = (ability: CommandAbility) => {
    if (!ability.lastUsed) return 0;
    const remaining = ability.cooldown - (Date.now() - ability.lastUsed);
    return Math.max(0, remaining);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const activateAbility = async (ability: CommandAbility) => {
    if (!canUseAbility(ability) || activating) return;
    
    setActivating(ability.id);
    
    try {
      // Simulate ability activation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would make an API call to activate the ability
      console.log(`Activated ability: ${ability.name}`);
      
      // Update last used time (in a real implementation, this would come from the server)
      ability.lastUsed = Date.now();
      
    } catch (error) {
      console.error('Failed to activate ability:', error);
    } finally {
      setActivating(null);
    }
  };

  if (!plot) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Star className="w-5 h-5 mr-2 text-purple-400" />
          Command Abilities
        </h3>
        <div className="text-center py-8 text-gray-400">
          <Crown className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No command center available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Star className="w-5 h-5 mr-2 text-purple-400" />
        Command Abilities
        <div className="ml-auto flex items-center space-x-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm">
            {plot.resources.materials} Command Points
          </span>
        </div>
      </h3>

      {/* Command Points Info */}
      <div className="mb-6 p-4 bg-purple-600/20 border border-purple-600/50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Crown className="w-6 h-6 text-purple-400" />
          <div>
            <h4 className="font-semibold text-purple-400">Command Authority</h4>
            <p className="text-sm text-gray-300">
              Use materials as command points to activate powerful strategic abilities
            </p>
          </div>
        </div>
      </div>

      {/* Abilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {abilities.map((ability) => {
          const canUse = canUseAbility(ability);
          const cooldownRemaining = getCooldownRemaining(ability);
          const onCooldown = cooldownRemaining > 0;
          const isActivating = activating === ability.id;
          
          return (
            <div 
              key={ability.id} 
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedAbility === ability.id
                  ? 'bg-purple-600/20 border-purple-500'
                  : canUse && !onCooldown
                  ? 'bg-gray-700 border-gray-600 hover:border-purple-500'
                  : 'bg-gray-700 border-gray-600 opacity-60'
              }`}
              onClick={() => setSelectedAbility(selectedAbility === ability.id ? null : ability.id)}
            >
              <div className="flex items-start space-x-3">
                <ability.icon className={`w-6 h-6 mt-1 ${
                  canUse && !onCooldown ? 'text-purple-400' : 'text-gray-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium ${
                      canUse && !onCooldown ? 'text-white' : 'text-gray-400'
                    }`}>
                      {ability.name}
                    </h4>
                    <div className="flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400">{ability.cost}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-2">{ability.description}</p>
                  
                  <div className="text-xs text-green-400 mb-2">{ability.effect}</div>
                  
                  {/* Requirements */}
                  <div className="text-xs text-gray-500 mb-2">
                    Requires: {ability.requirements.join(', ')}
                  </div>
                  
                  {/* Cooldown */}
                  {onCooldown && (
                    <div className="flex items-center space-x-1 text-xs text-red-400">
                      <Clock className="w-3 h-3" />
                      <span>Cooldown: {formatTime(cooldownRemaining)}</span>
                    </div>
                  )}
                  
                  {/* Duration */}
                  {ability.duration && (
                    <div className="text-xs text-blue-400">
                      Duration: {formatTime(ability.duration)}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedAbility === ability.id && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      activateAbility(ability);
                    }}
                    disabled={!canUse || onCooldown || isActivating}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      canUse && !onCooldown && !isActivating
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isActivating ? 'Activating...' : 
                     onCooldown ? 'On Cooldown' :
                     !canUse ? 'Requirements Not Met' : 'Activate'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Effects */}
      <div className="mt-6">
        <h4 className="text-md font-semibold text-white mb-3">Active Effects</h4>
        <div className="text-center py-4 text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No active command abilities</p>
        </div>
      </div>
    </div>
  );
}