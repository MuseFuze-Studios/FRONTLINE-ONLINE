import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { hexToPixel, generateHexPath, HEX_SIZE } from '../utils/hexUtils';
import { HexTile } from '../types/game';
import { MapPin, Sword, Shield, Users, AlertTriangle } from 'lucide-react';

interface HexMapProps {
  onHexClick?: (hex: HexTile) => void;
  selectedHex?: string;
  deploymentMode?: boolean;
}

export function HexMap({ onHexClick, selectedHex, deploymentMode }: HexMapProps) {
  const { state } = useGame();
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ hex: HexTile; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
    if (deploymentMode && hex.nation !== state.user?.nation) return 0.3;
    if (selectedHex === hex.id) return 1;
    if (hoveredHex === hex.id) return 0.8;
    return 0.6;
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
                className={`cursor-pointer transition-all duration-200 ${
                  deploymentMode && hex.nation !== state.user?.nation 
                    ? 'cursor-not-allowed' 
                    : 'hover:stroke-white hover:stroke-2'
                }`}
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
                <circle
                  cx={center.x + 15}
                  cy={center.y - 15}
                  r="8"
                  fill="#1F2937"
                  stroke={color}
                  strokeWidth="2"
                />
              )}
              
              {hex.units > 0 && (
                <text
                  x={center.x + 15}
                  y={center.y - 11}
                  textAnchor="middle"
                  className="fill-white text-xs font-bold pointer-events-none"
                >
                  {hex.units}
                </text>
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
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm text-white shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-semibold mb-1">{tooltip.hex.name}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Nation:</span>
              <span className="capitalize">{tooltip.hex.nation}</span>
            </div>
            {tooltip.hex.owner && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Owner:</span>
                <span>{tooltip.hex.owner === state.user?.id ? 'You' : 'Player'}</span>
              </div>
            )}
            {tooltip.hex.units > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Units:</span>
                <span>{tooltip.hex.units}</span>
              </div>
            )}
            {tooltip.hex.underAttack && (
              <div className="text-red-400 flex items-center">
                <Sword className="w-3 h-3 mr-1" />
                Under Attack
              </div>
            )}
            {tooltip.hex.isContested && !tooltip.hex.underAttack && (
              <div className="text-yellow-400 flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Contested
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}