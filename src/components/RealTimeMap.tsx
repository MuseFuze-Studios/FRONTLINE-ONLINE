import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { hexToPixel, generateHexPath, HEX_SIZE } from '../utils/hexUtils';
import { HexTile } from '../types/game';
import { MapPin, Sword, Shield, Users, AlertTriangle, Eye, Target, Clock } from 'lucide-react';
import { apiService } from '../services/api';

interface RealTimeMapProps {
  onHexClick?: (hex: HexTile) => void;
  selectedHex?: string;
  showMovements?: boolean;
}

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

export function RealTimeMap({ onHexClick, selectedHex, showMovements = true }: RealTimeMapProps) {
  const { state, refreshGameData } = useGame();
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ hex: HexTile; x: number; y: number } | null>(null);
  const [playerActions, setPlayerActions] = useState<PlayerAction[]>([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const svgRef = useRef<SVGSVGElement>(null);

  // Real-time updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshGameData();
      if (showMovements) {
        loadPlayerActions();
      }
      setLastUpdate(Date.now());
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshGameData, showMovements]);

  const loadPlayerActions = async () => {
    try {
      const data = await apiService.getPlayerActions();
      setPlayerActions(data.actions || []);
    } catch (error) {
      console.error('Failed to load player actions:', error);
    }
  };

  const nationColors = {
    union: '#3B82F6',
    dominion: '#EF4444',
    syndicate: '#10B981',
    neutral: '#6B7280'
  };

  const handleHexClick = (hex: HexTile) => {
    if (onHexClick) {
      onHexClick(hex);
    }
  };

  const handleHexHover = (hex: HexTile, event: React.MouseEvent) => {
    setHoveredHex(hex.id);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        hex,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  };

  const handleHexLeave = () => {
    setHoveredHex(null);
    setTooltip(null);
  };

  const getHexColor = (hex: HexTile) => {
    if (hex.type === 'water') return '#1E40AF';
    if (hex.underAttack) return '#DC2626';
    if (hex.isContested) return '#F59E0B';
    return nationColors[hex.nation as keyof typeof nationColors] || nationColors.neutral;
  };

  const getHexOpacity = (hex: HexTile) => {
    if (selectedHex === hex.id) return 1;
    if (hoveredHex === hex.id) return 0.8;
    if (hex.underAttack) return 0.9;
    if (hex.isContested) return 0.7;
    return 0.6;
  };

  // Calculate movement progress for animations
  const getMovementProgress = (action: PlayerAction) => {
    const elapsed = Date.now() - action.startedAt;
    const total = action.completesAt - action.startedAt;
    return Math.max(0, Math.min(1, elapsed / total));
  };

  // Calculate viewBox to center the map
  const minX = Math.min(...state.hexMap.map(hex => hexToPixel({ q: hex.q, r: hex.r }).x));
  const maxX = Math.max(...state.hexMap.map(hex => hexToPixel({ q: hex.q, r: hex.r }).x));
  const minY = Math.min(...state.hexMap.map(hex => hexToPixel({ q: hex.q, r: hex.r }).y));
  const maxY = Math.max(...state.hexMap.map(hex => hexToPixel({ q: hex.q, r: hex.r }).y));
  
  const padding = HEX_SIZE * 2;
  const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      {/* Real-time indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2 bg-gray-800/90 px-3 py-2 rounded-lg">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-green-400 text-sm font-medium">LIVE</span>
        <span className="text-gray-400 text-xs">
          Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-96 md:h-[500px]"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' }}
      >
        {/* Hex tiles */}
        {state.hexMap.map((hex) => {
          const center = hexToPixel({ q: hex.q, r: hex.r });
          const path = generateHexPath(center, HEX_SIZE);
          const color = getHexColor(hex);
          const opacity = getHexOpacity(hex);

          return (
            <g key={hex.id}>
              <path
                d={path}
                fill={color}
                fillOpacity={opacity}
                stroke="#374151"
                strokeWidth="1"
                className="cursor-pointer transition-all duration-200 hover:stroke-white hover:stroke-2"
                onClick={() => handleHexClick(hex)}
                onMouseEnter={(e) => handleHexHover(hex, e)}
                onMouseLeave={handleHexLeave}
              />
              
              {/* Hex content indicators */}
              {hex.owner === state.user?.id && (
                <MapPin
                  x={center.x - 6}
                  y={center.y - 6}
                  width="12"
                  height="12"
                  className="fill-yellow-400 pointer-events-none"
                />
              )}
              
              {hex.units > 0 && (
                <>
                  <circle
                    cx={center.x + 15}
                    cy={center.y - 15}
                    r="8"
                    fill="#1F2937"
                    stroke={color}
                    strokeWidth="2"
                  />
                  <text
                    x={center.x + 15}
                    y={center.y - 11}
                    textAnchor="middle"
                    className="fill-white text-xs font-bold pointer-events-none"
                  >
                    {hex.units}
                  </text>
                </>
              )}
              
              {hex.underAttack && (
                <Sword
                  x={center.x - 15}
                  y={center.y - 15}
                  width="12"
                  height="12"
                  className="fill-red-400 animate-pulse pointer-events-none"
                />
              )}
              
              {hex.isContested && !hex.underAttack && (
                <AlertTriangle
                  x={center.x - 6}
                  y={center.y + 8}
                  width="12"
                  height="12"
                  className="fill-yellow-400 animate-pulse pointer-events-none"
                />
              )}
            </g>
          );
        })}

        {/* Movement animations */}
        {showMovements && playerActions
          .filter(action => action.status === 'in_progress')
          .map(action => {
            const fromHex = state.hexMap.find(h => h.id === action.fromHex);
            const toHex = state.hexMap.find(h => h.id === action.toHex);
            
            if (!fromHex || !toHex) return null;

            const fromCenter = hexToPixel({ q: fromHex.q, r: fromHex.r });
            const toCenter = hexToPixel({ q: toHex.q, r: toHex.r });
            const progress = getMovementProgress(action);
            
            // Calculate current position
            const currentX = fromCenter.x + (toCenter.x - fromCenter.x) * progress;
            const currentY = fromCenter.y + (toCenter.y - fromCenter.y) * progress;

            const isMyUnit = action.playerId === state.user?.id;
            const unitColor = isMyUnit ? '#10B981' : '#EF4444';

            return (
              <g key={action.id}>
                {/* Movement path */}
                <line
                  x1={fromCenter.x}
                  y1={fromCenter.y}
                  x2={toCenter.x}
                  y2={toCenter.y}
                  stroke={unitColor}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.6"
                  className="pointer-events-none"
                />
                
                {/* Moving unit */}
                <circle
                  cx={currentX}
                  cy={currentY}
                  r="6"
                  fill={unitColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="pointer-events-none"
                >
                  <animate
                    attributeName="r"
                    values="6;8;6"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
                
                {/* Unit type indicator */}
                <text
                  x={currentX}
                  y={currentY + 2}
                  textAnchor="middle"
                  className="fill-white text-xs font-bold pointer-events-none"
                >
                  {action.actionType === 'attack' ? '⚔' : 
                   action.actionType === 'occupy' ? '🏴' : '→'}
                </text>
              </g>
            );
          })}
      </svg>

      {/* Enhanced Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-gray-800 border border-gray-600 rounded-lg p-4 text-sm text-white shadow-xl pointer-events-none max-w-xs"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-semibold mb-2 text-lg">{tooltip.hex.name}</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Nation:</span>
              <span className="capitalize font-medium">{tooltip.hex.nation}</span>
            </div>
            {tooltip.hex.owner && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Owner:</span>
                <span className="font-medium">{tooltip.hex.owner === state.user?.id ? 'You' : 'Enemy Player'}</span>
              </div>
            )}
            {tooltip.hex.units > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Units:</span>
                <span className="font-medium flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {tooltip.hex.units}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Coordinates:</span>
              <span className="font-mono text-xs">{tooltip.hex.q}, {tooltip.hex.r}</span>
            </div>
            
            {/* Status indicators */}
            <div className="pt-2 border-t border-gray-600">
              {tooltip.hex.underAttack && (
                <div className="text-red-400 flex items-center mb-1">
                  <Sword className="w-3 h-3 mr-1" />
                  Under Attack
                </div>
              )}
              {tooltip.hex.isContested && !tooltip.hex.underAttack && (
                <div className="text-yellow-400 flex items-center mb-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Contested Territory
                </div>
              )}
              {tooltip.hex.owner === state.user?.id && (
                <div className="text-green-400 flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Your Territory
                </div>
              )}
            </div>

            {/* Active movements to this hex */}
            {showMovements && playerActions
              .filter(action => action.toHex === tooltip.hex.id && action.status === 'in_progress')
              .length > 0 && (
              <div className="pt-2 border-t border-gray-600">
                <div className="text-orange-400 flex items-center text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  Incoming Forces Detected
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Movement Legend */}
      {showMovements && playerActions.filter(a => a.status === 'in_progress').length > 0 && (
        <div className="absolute bottom-4 left-4 bg-gray-800/90 rounded-lg p-3 text-xs">
          <div className="font-medium text-white mb-2">Unit Movements</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">Your Forces</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">Enemy Forces</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}