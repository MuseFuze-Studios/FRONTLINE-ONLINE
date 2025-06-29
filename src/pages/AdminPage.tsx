import React from 'react';
import { Shield } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { AdminPanel } from '../components/AdminPanel';

export function AdminPage() {
  const { state } = useGame();
  const user = state.user;

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Administrator privileges required to access this page.</p>
        </div>
      </div>
    );
  }

  return <AdminPanel />;
}