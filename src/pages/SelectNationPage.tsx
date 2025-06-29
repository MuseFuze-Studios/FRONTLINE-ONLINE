import React, { useState } from 'react';
import { NationCard } from '../components/NationCard';
import { useGame } from '../context/GameContext';
import { Globe, ArrowRight } from 'lucide-react';

export function SelectNationPage() {
  const { state, selectNation } = useGame();
  const [selectedNation, setSelectedNation] = useState<string>('');

  const handleConfirm = () => {
    if (selectedNation) {
      selectNation(selectedNation);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
            <Globe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Nation</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Select your allegiance and join the war effort. Each nation has unique strengths and strategic advantages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {state.nations.map((nation) => (
            <NationCard
              key={nation.id}
              nation={nation}
              selected={selectedNation === nation.id}
              onSelect={setSelectedNation}
            />
          ))}
        </div>

        {selectedNation && (
          <div className="text-center">
            <button
              onClick={handleConfirm}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              <span>Deploy to Command</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}