import React from 'react';
import { Shield, Home, Map, Building, Users, Flag, LogOut, RotateCcw, Settings } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { state, logout, softReset } = useGame();
  const user = state.user;

  if (!user) return null;

  const navItems = [
    { id: 'dashboard', label: 'Command', icon: Home },
    { id: 'your-plot', label: 'Base', icon: Building },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'nation', label: 'Nation', icon: Flag }
  ];

  // Add admin panel for admin users
  if (user.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Settings });
  }

  const nationColors = {
    union: 'text-blue-400',
    dominion: 'text-red-400',
    syndicate: 'text-green-400'
  };

  const handleSoftReset = () => {
    if (confirm('Are you sure you want to reset the world? This will clear all player data and regenerate the map.')) {
      softReset();
    }
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold text-white">FRONTLINE</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-white">
                {user.username}
                {user.role === 'admin' && (
                  <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded">ADMIN</span>
                )}
              </div>
              <div className={`text-xs capitalize ${nationColors[user.nation as keyof typeof nationColors] || 'text-gray-400'}`}>
                {user.nation ? `${user.nation} Command` : 'Unassigned'}
              </div>
            </div>
            
            {/* Admin Actions */}
            {user.role !== 'admin' && (
              <button
                onClick={handleSoftReset}
                className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/20 rounded-lg transition-colors"
                title="Reset World (Admin)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}