import React from 'react';
import { Users, MapPin, Crown } from 'lucide-react';
import { Nation } from '../types/game';

interface NationCardProps {
  nation: Nation;
  selected: boolean;
  onSelect: (nationId: string) => void;
}

export function NationCard({ nation, selected, onSelect }: NationCardProps) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-800 border-blue-500',
    red: 'from-red-600 to-red-800 border-red-500',
    green: 'from-green-600 to-green-800 border-green-500'
  };

  const bgClass = colorClasses[nation.color as keyof typeof colorClasses];

  return (
    <div
      className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
        selected 
          ? `bg-gradient-to-br ${bgClass} shadow-2xl` 
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      }`}
      onClick={() => onSelect(nation.id)}
    >
      <div className="text-center mb-4">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${
          selected ? 'bg-white/20' : 'bg-gray-700'
        }`}>
          <Crown className={`w-8 h-8 ${selected ? 'text-white' : 'text-gray-400'}`} />
        </div>
        <h3 className={`text-xl font-bold ${selected ? 'text-white' : 'text-gray-200'}`}>
          {nation.name}
        </h3>
      </div>

      <p className={`text-sm mb-4 ${selected ? 'text-gray-100' : 'text-gray-400'}`}>
        {nation.description}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className={`w-4 h-4 ${selected ? 'text-white' : 'text-gray-400'}`} />
            <span className={`text-sm ${selected ? 'text-gray-100' : 'text-gray-300'}`}>
              Territories
            </span>
          </div>
          <span className={`font-semibold ${selected ? 'text-white' : 'text-gray-200'}`}>
            {nation.territories}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className={`w-4 h-4 ${selected ? 'text-white' : 'text-gray-400'}`} />
            <span className={`text-sm ${selected ? 'text-gray-100' : 'text-gray-300'}`}>
              Active Players
            </span>
          </div>
          <span className={`font-semibold ${selected ? 'text-white' : 'text-gray-200'}`}>
            {nation.totalPlayers.toLocaleString()}
          </span>
        </div>

        {nation.leader && (
          <div className="pt-2 border-t border-gray-600">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${selected ? 'text-gray-100' : 'text-gray-400'}`}>
                Supreme Commander
              </span>
              <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-gray-200'}`}>
                {nation.leader}
              </span>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}