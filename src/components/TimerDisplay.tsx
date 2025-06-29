import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerDisplayProps {
  endTime: number | null;
  label: string;
  className?: string;
}

export function TimerDisplay({ endTime, label, className = '' }: TimerDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!endTime) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return 'Complete';
    
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  if (!endTime || timeRemaining <= 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Clock className="w-3 h-3 text-yellow-400" />
      <span className="text-yellow-400 text-sm">
        {label}: {formatTime(timeRemaining)}
      </span>
    </div>
  );
}