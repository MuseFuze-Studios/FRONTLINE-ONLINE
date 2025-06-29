import express from 'express';

const router = express.Router();

export function createAdminRoutes(pool, gameSettings, authenticateToken, requireAdmin, generateBalancedTerritories, createAIPlayers) {
  // Get admin settings
  router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
      res.json({ settings: gameSettings });
    } catch (error) {
      console.error('Get admin settings error:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  // Update admin settings
  router.post('/settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { settings } = req.body;
      Object.assign(gameSettings, settings);
      res.json({ success: true, settings: gameSettings });
    } catch (error) {
      console.error('Update admin settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Soft wipe
  router.post('/soft-wipe', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Reset all plots resources and population
        await connection.execute(`
          UPDATE plots SET 
            manpower = 100, materials = 50, fuel = 25, food = 30,
            population_current = 0, population_cap = 50
        `);
        
        // Remove all buildings except headquarters
        await connection.execute(`DELETE FROM buildings WHERE type != 'headquarters'`);
        
        // Remove all troops
        await connection.execute(`DELETE FROM troops`);
        
        // Clear construction queue
        await connection.execute(`DELETE FROM construction_queue`);
        
        // Reset territories to neutral (except some strategic ones)
        await connection.execute(`
          UPDATE territories SET 
            controlled_by_nation = 'neutral',
            controlled_by_player = NULL,
            is_contested = FALSE,
            under_attack = FALSE
        `);
        
        await connection.commit();
        connection.release();
        
        res.json({ success: true, message: 'Soft wipe completed successfully' });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Soft wipe error:', error);
      res.status(500).json({ error: 'Soft wipe failed' });
    }
  });

  // FIXED Hard wipe
  router.post('/hard-wipe', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Delete all player actions first (foreign key constraint)
        await connection.execute(`DELETE FROM player_actions`);
        
        // Delete all trades
        await connection.execute(`DELETE FROM trades`);
        
        // Delete all supply convoys
        await connection.execute(`DELETE FROM supply_convoys`);
        
        // Delete all construction queue items
        await connection.execute(`DELETE FROM construction_queue`);
        
        // Delete all troops
        await connection.execute(`DELETE FROM troops`);
        
        // Delete all buildings
        await connection.execute(`DELETE FROM buildings`);
        
        // Delete all plots
        await connection.execute(`DELETE FROM plots`);
        
        // Delete all non-admin players
        await connection.execute(`DELETE FROM players WHERE role != 'admin'`);
        
        // Reset territories to balanced distribution
        await connection.execute(`DELETE FROM territories`);
        
        await connection.commit();
        connection.release();
        
        // Regenerate balanced territories
        const territories = generateBalancedTerritories();
        const territoryConnection = await pool.getConnection();
        
        for (const territory of territories) {
          await territoryConnection.execute(`
            INSERT INTO territories (id, hex_id, controlled_by_nation, is_contested, under_attack)
            VALUES (?, ?, ?, FALSE, FALSE)
          `, [territory.id, territory.hex_id, territory.nation]);
        }
        
        territoryConnection.release();
        
        // Recreate AI players
        await createAIPlayers();
        
        res.json({ success: true, message: 'Hard wipe completed successfully - all player data reset' });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Hard wipe error:', error);
      res.status(500).json({ error: 'Hard wipe failed' });
    }
  });

  // IMPROVED Reset map
  router.post('/reset-map', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Clear existing territories
        await connection.execute('DELETE FROM territories');
        
        // Generate new balanced territories with improved distribution
        const territories = generateBalancedTerritories();
        
        // Insert new territories
        for (const territory of territories) {
          await connection.execute(`
            INSERT INTO territories (id, hex_id, controlled_by_nation, is_contested, under_attack)
            VALUES (?, ?, ?, FALSE, FALSE)
          `, [territory.id, territory.hex_id, territory.nation]);
        }
        
        await connection.commit();
        connection.release();
        
        res.json({ 
          success: true, 
          message: `Map reset completed - ${territories.length} territories with balanced faction distribution`,
          territories: territories.length
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Map reset error:', error);
      res.status(500).json({ error: 'Map reset failed' });
    }
  });

  // Territory management
  router.put('/territory/:hexId', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { hexId } = req.params;
      const { controlled_by_nation, is_contested, under_attack } = req.body;
      
      await pool.execute(`
        UPDATE territories SET 
          controlled_by_nation = ?, 
          is_contested = ?, 
          under_attack = ?
        WHERE hex_id = ?
      `, [controlled_by_nation, is_contested, under_attack, hexId]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Update territory error:', error);
      res.status(500).json({ error: 'Failed to update territory' });
    }
  });

  router.post('/territory', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { hex_id, controlled_by_nation, is_contested, under_attack } = req.body;
      const territoryId = `territory_${Date.now()}`;
      
      await pool.execute(`
        INSERT INTO territories (id, hex_id, controlled_by_nation, is_contested, under_attack)
        VALUES (?, ?, ?, ?, ?)
      `, [territoryId, hex_id, controlled_by_nation, is_contested || false, under_attack || false]);
      
      res.json({ success: true, territoryId });
    } catch (error) {
      console.error('Create territory error:', error);
      res.status(500).json({ error: 'Failed to create territory' });
    }
  });

  router.delete('/territory/:hexId', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { hexId } = req.params;
      
      await pool.execute('DELETE FROM territories WHERE hex_id = ?', [hexId]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete territory error:', error);
      res.status(500).json({ error: 'Failed to delete territory' });
    }
  });

  return router;
}