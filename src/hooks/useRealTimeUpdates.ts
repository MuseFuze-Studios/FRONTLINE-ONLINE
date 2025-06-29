import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

export function useRealTimeUpdates() {
  const { state, refreshPlotData, refreshGameData } = useGame();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!state.token) return;

    // Set up WebSocket connection for real-time updates
    const connectWebSocket = () => {
      const wsUrl = `ws://localhost:3001`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        // Authenticate with the server
        wsRef.current?.send(JSON.stringify({
          type: 'auth',
          token: state.token
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'auth_success':
              console.log('WebSocket authenticated');
              break;
            case 'plot_update':
              refreshPlotData();
              break;
            case 'game_update':
              refreshGameData();
              break;
            case 'timer_update':
              // Force refresh to get latest timer states
              refreshPlotData();
              break;
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    // Set up interval for timer updates (every 10 seconds)
    intervalRef.current = setInterval(() => {
      refreshPlotData();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [state.token, refreshPlotData, refreshGameData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
}