import express from 'express';

const router = express.Router();

export function createTradeRoutes(pool, authenticateToken) {
  // Get all trades for a player
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const playerId = req.user.id;
      
      const [trades] = await pool.execute(`
        SELECT t.*, 
          fp.username as from_username, fp.nation as from_nation, fp.is_ai as from_is_ai,
          tp.username as to_username, tp.nation as to_nation, tp.is_ai as to_is_ai
        FROM trades t
        JOIN players fp ON t.from_player_id = fp.id
        JOIN players tp ON t.to_player_id = tp.id
        WHERE t.from_player_id = ? OR t.to_player_id = ?
        ORDER BY t.created_at DESC
      `, [playerId, playerId]);
      
      res.json({ 
        trades: trades.map(trade => ({
          id: trade.id,
          fromPlayerId: trade.from_player_id,
          toPlayerId: trade.to_player_id,
          offeredResource: trade.offered_resource,
          offeredAmount: trade.offered_amount,
          requestedResource: trade.requested_resource,
          requestedAmount: trade.requested_amount,
          status: trade.status,
          createdAt: new Date(trade.created_at).getTime(),
          expiresAt: new Date(trade.expires_at).getTime(),
          fromPlayer: {
            username: trade.from_username,
            nation: trade.from_nation,
            isAI: trade.from_is_ai
          },
          toPlayer: {
            username: trade.to_username,
            nation: trade.to_nation,
            isAI: trade.to_is_ai
          }
        }))
      });
    } catch (error) {
      console.error('Get trades error:', error);
      res.status(500).json({ error: 'Failed to get trades' });
    }
  });

  // Get all players for trading
  router.get('/players', authenticateToken, async (req, res) => {
    try {
      const [players] = await pool.execute(`
        SELECT id, username, nation, is_ai
        FROM players
        WHERE nation IS NOT NULL
        ORDER BY is_ai ASC, username ASC
      `);
      
      res.json({ players });
    } catch (error) {
      console.error('Get players error:', error);
      res.status(500).json({ error: 'Failed to get players' });
    }
  });

  // Create a new trade
  router.post('/create', authenticateToken, async (req, res) => {
    try {
      const { toPlayerId, offeredResource, offeredAmount, requestedResource, requestedAmount } = req.body;
      const fromPlayerId = req.user.id;
      
      // Validate inputs
      if (!toPlayerId || !offeredResource || !offeredAmount || !requestedResource || !requestedAmount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (fromPlayerId === toPlayerId) {
        return res.status(400).json({ error: 'Cannot trade with yourself' });
      }
      
      // Check if player has enough resources
      const [plotRows] = await pool.execute(
        'SELECT * FROM plots WHERE player_id = ?',
        [fromPlayerId]
      );
      
      if (plotRows.length === 0) {
        return res.status(404).json({ error: 'Plot not found' });
      }
      
      const plot = plotRows[0];
      if (plot[offeredResource] < offeredAmount) {
        return res.status(400).json({ error: `Insufficient ${offeredResource}` });
      }
      
      // Create trade
      const tradeId = `trade_${Date.now()}_${fromPlayerId}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await pool.execute(`
        INSERT INTO trades (id, from_player_id, to_player_id, offered_resource, offered_amount, requested_resource, requested_amount, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [tradeId, fromPlayerId, toPlayerId, offeredResource, offeredAmount, requestedResource, requestedAmount, expiresAt]);
      
      res.json({ success: true, tradeId });
    } catch (error) {
      console.error('Create trade error:', error);
      res.status(500).json({ error: 'Failed to create trade' });
    }
  });

  // Accept a trade
  router.post('/accept', authenticateToken, async (req, res) => {
    try {
      const { tradeId } = req.body;
      const playerId = req.user.id;
      
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Get trade details
        const [tradeRows] = await connection.execute(
          'SELECT * FROM trades WHERE id = ? AND to_player_id = ? AND status = "pending"',
          [tradeId, playerId]
        );
        
        if (tradeRows.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({ error: 'Trade not found or not available' });
        }
        
        const trade = tradeRows[0];
        
        // Check if trade has expired
        if (new Date() > new Date(trade.expires_at)) {
          await connection.execute(
            'UPDATE trades SET status = "expired" WHERE id = ?',
            [tradeId]
          );
          await connection.rollback();
          connection.release();
          return res.status(400).json({ error: 'Trade has expired' });
        }
        
        // Get both players' plots
        const [fromPlotRows] = await connection.execute(
          'SELECT * FROM plots WHERE player_id = ?',
          [trade.from_player_id]
        );
        
        const [toPlotRows] = await connection.execute(
          'SELECT * FROM plots WHERE player_id = ?',
          [trade.to_player_id]
        );
        
        if (fromPlotRows.length === 0 || toPlotRows.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({ error: 'Player plots not found' });
        }
        
        const fromPlot = fromPlotRows[0];
        const toPlot = toPlotRows[0];
        
        // Check if both players have enough resources
        if (fromPlot[trade.offered_resource] < trade.offered_amount) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ error: 'Offering player has insufficient resources' });
        }
        
        if (toPlot[trade.requested_resource] < trade.requested_amount) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ error: 'You have insufficient resources' });
        }
        
        // Execute the trade
        await connection.execute(`
          UPDATE plots SET ${trade.offered_resource} = ${trade.offered_resource} - ?, ${trade.requested_resource} = ${trade.requested_resource} + ?
          WHERE player_id = ?
        `, [trade.offered_amount, trade.requested_amount, trade.from_player_id]);
        
        await connection.execute(`
          UPDATE plots SET ${trade.requested_resource} = ${trade.requested_resource} - ?, ${trade.offered_resource} = ${trade.offered_resource} + ?
          WHERE player_id = ?
        `, [trade.requested_amount, trade.offered_amount, trade.to_player_id]);
        
        // Mark trade as accepted
        await connection.execute(
          'UPDATE trades SET status = "accepted" WHERE id = ?',
          [tradeId]
        );
        
        await connection.commit();
        connection.release();
        
        res.json({ success: true });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Accept trade error:', error);
      res.status(500).json({ error: 'Failed to accept trade' });
    }
  });

  // Reject a trade
  router.post('/reject', authenticateToken, async (req, res) => {
    try {
      const { tradeId } = req.body;
      const playerId = req.user.id;
      
      const [result] = await pool.execute(
        'UPDATE trades SET status = "rejected" WHERE id = ? AND to_player_id = ? AND status = "pending"',
        [tradeId, playerId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Trade not found or not available' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Reject trade error:', error);
      res.status(500).json({ error: 'Failed to reject trade' });
    }
  });

  return router;
}