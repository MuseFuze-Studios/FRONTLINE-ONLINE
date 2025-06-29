import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

export function setupWebSocket(server, JWT_SECRET) {
  const wss = new WebSocketServer({ server });
  const clients = new Map();

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'auth' && data.token) {
          jwt.verify(data.token, JWT_SECRET, (err, user) => {
            if (!err) {
              clients.set(ws, user);
              ws.send(JSON.stringify({ type: 'auth_success' }));
              console.log(`WebSocket authenticated for user ${user.id}`);
            } else {
              ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast updates to connected clients
  function broadcastUpdate(userId, data) {
    for (const [ws, user] of clients.entries()) {
      if (user.id === userId && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(data));
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          clients.delete(ws);
        }
      }
    }
  }

  // Broadcast to all clients
  function broadcastToAll(data) {
    for (const [ws, user] of clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(data));
        } catch (error) {
          console.error('Error broadcasting WebSocket message:', error);
          clients.delete(ws);
        }
      }
    }
  }

  return { broadcastUpdate, broadcastToAll, clients };
}