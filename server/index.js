import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { createServer } from 'http';
import { createAuthRoutes } from './routes/auth.js';
import { createTradeRoutes } from './routes/trades.js';
import { createAdminRoutes } from './routes/admin.js';
import { setupWebSocket } from './websocket.js';
import { setupTimers } from './timers.js';
import { setupAI } from './ai.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'frontline_online',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'frontline_secret_key_2024';

// Game settings (can be modified by admin)
const gameSettings = {
  resourceGenerationRate: 1.0,
  populationGrowthRate: 1.0,
  maxTroopCapacity: 1000,
  constructionTimeModifier: 1.0,
  moraleDropRate: 1.0,
  moraleRecoveryRate: 1.0
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to verify admin role
const requireAdmin = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT role FROM players WHERE id = ?',
      [req.user.id]
    );
    
    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Helper function to recalculate population
async function recalculatePopulation(plotId) {
  try {
    // Get all troops for this plot (excluding those being trained)
    const [troops] = await pool.execute(
      'SELECT SUM(count) as total_troops FROM troops WHERE plot_id = ? AND is_training = FALSE',
      [plotId]
    );
    
    // Get housing count for population cap
    const [housing] = await pool.execute(
      'SELECT COUNT(*) as housing_count FROM buildings WHERE plot_id = ? AND type = "housing" AND is_under_construction = FALSE',
      [plotId]
    );
    
    const totalTroops = troops[0].total_troops || 0;
    const housingCount = housing[0].housing_count || 0;
    const populationCap = 50 + (housingCount * 25);
    
    // Update the plot with correct population
    await pool.execute(
      'UPDATE plots SET population_current = ?, population_cap = ? WHERE id = ?',
      [totalTroops, populationCap, plotId]
    );
    
    return { current: totalTroops, cap: populationCap };
  } catch (error) {
    console.error('Population recalculation error:', error);
    return null;
  }
}

// Process completed deployments with combat resolution
async function processCompletedDeployments() {
  try {
    // Fixed SQL query - use correct table aliases
    const [completedActions] = await pool.execute(`
      SELECT pa.*, pl.nation as attacker_nation, p.id as attacker_plot_id
      FROM player_actions pa
      JOIN players pl ON pa.player_id = pl.id
      JOIN plots p ON pl.plot_id = p.id
      WHERE pa.status = 'in_progress' AND pa.completes_at <= NOW()
    `);

    for (const action of completedActions) {
      try {
        // Parse troop data safely
        let troopData = {};
        if (action.troop_data) {
          try {
            troopData = typeof action.troop_data === 'string' 
              ? JSON.parse(action.troop_data) 
              : action.troop_data;
          } catch (parseError) {
            console.error('Failed to parse troop data:', parseError);
            troopData = { totalUnits: 1, totalStrength: 10 };
          }
        }

        // Get or create target territory
        let [territoryRows] = await pool.execute(
          'SELECT * FROM territories WHERE hex_id = ?',
          [action.to_hex]
        );

        if (territoryRows.length === 0) {
          // Create neutral territory if it doesn't exist
          const territoryId = `territory_${Date.now()}_${action.to_hex}`;
          await pool.execute(`
            INSERT INTO territories (id, hex_id, controlled_by_nation, is_contested, under_attack)
            VALUES (?, ?, 'neutral', FALSE, FALSE)
          `, [territoryId, action.to_hex]);
          
          // Fetch the newly created territory
          [territoryRows] = await pool.execute(
            'SELECT * FROM territories WHERE hex_id = ?',
            [action.to_hex]
          );
        }

        const territory = territoryRows[0];
        
        // Combat resolution based on action type
        if (action.action_type === 'attack') {
          if (territory.controlled_by_nation === 'neutral') {
            // Capture neutral territory
            await pool.execute(`
              UPDATE territories SET 
                controlled_by_nation = ?, 
                controlled_by_player = ?,
                is_contested = FALSE,
                under_attack = FALSE
              WHERE hex_id = ?
            `, [action.attacker_nation, action.player_id, action.to_hex]);
            
            console.log(`Territory ${action.to_hex} captured by ${action.attacker_nation}`);
          } else if (territory.controlled_by_nation !== action.attacker_nation) {
            // Attack enemy territory - resolve combat
            const attackerStrength = troopData.totalStrength || 10;
            const defenderStrength = Math.floor(Math.random() * 20) + 5; // Random defender strength
            
            // Combat calculation with defensive bonus
            const attackerPower = attackerStrength;
            const defenderPower = Math.floor(defenderStrength * 1.2); // 20% defensive bonus
            
            if (attackerPower > defenderPower) {
              // Attacker wins - capture territory
              await pool.execute(`
                UPDATE territories SET 
                  controlled_by_nation = ?, 
                  controlled_by_player = ?,
                  is_contested = FALSE,
                  under_attack = FALSE
                WHERE hex_id = ?
              `, [action.attacker_nation, action.player_id, action.to_hex]);
              
              console.log(`Territory ${action.to_hex} conquered by ${action.attacker_nation}`);
            } else {
              // Defender wins - mark as contested
              await pool.execute(`
                UPDATE territories SET 
                  is_contested = TRUE,
                  under_attack = FALSE
                WHERE hex_id = ?
              `, [action.to_hex]);
              
              console.log(`Attack on ${action.to_hex} repelled - territory contested`);
            }
          }
        } else if (action.action_type === 'occupy') {
          // Reinforce friendly or neutral territory
          if (territory.controlled_by_nation === action.attacker_nation || territory.controlled_by_nation === 'neutral') {
            await pool.execute(`
              UPDATE territories SET 
                controlled_by_nation = ?, 
                controlled_by_player = ?,
                is_contested = FALSE,
                under_attack = FALSE
              WHERE hex_id = ?
            `, [action.attacker_nation, action.player_id, action.to_hex]);
            
            console.log(`Territory ${action.to_hex} reinforced by ${action.attacker_nation}`);
          }
        }

        // Mark action as completed
        await pool.execute(
          'UPDATE player_actions SET status = "completed" WHERE id = ?',
          [action.id]
        );

      } catch (actionError) {
        console.error(`Error processing action ${action.id}:`, actionError);
        // Mark action as failed
        await pool.execute(
          'UPDATE player_actions SET status = "cancelled" WHERE id = ?',
          [action.id]
        );
      }
    }

    if (completedActions.length > 0) {
      console.log(`Processed ${completedActions.length} completed deployments`);
    }

  } catch (error) {
    console.error('Process completed deployments error:', error);
  }
}

// Generate balanced territories for each faction
function generateBalancedTerritories() {
  const territories = [];
  const nations = ['union', 'dominion', 'syndicate', 'neutral'];
  
  // Create a strategic map layout with distinct regions for each faction
  const regions = {
    union: { centerQ: -8, centerR: -6, size: 6 },      // Northwest
    dominion: { centerQ: 6, centerR: -3, size: 6 },    // Northeast  
    syndicate: { centerQ: -2, centerR: 8, size: 6 },   // South
    neutral: { centerQ: 0, centerR: 0, size: 4 }       // Center
  };

  let territoryId = 1;

  // Generate territories for each region
  Object.entries(regions).forEach(([nation, region]) => {
    const hexCount = nation === 'neutral' ? 15 : 25; // Fewer neutral territories
    
    for (let i = 0; i < hexCount; i++) {
      // Generate hex coordinates around the region center
      const angle = (i / hexCount) * 2 * Math.PI;
      const distance = Math.random() * region.size + 1;
      
      const q = Math.round(region.centerQ + distance * Math.cos(angle));
      const r = Math.round(region.centerR + distance * Math.sin(angle));
      
      const hexId = `hex_${q}_${r}`;
      
      // Avoid duplicates
      if (!territories.find(t => t.hex_id === hexId)) {
        territories.push({
          id: `territory_${territoryId++}`,
          hex_id: hexId,
          nation: nation,
          q: q,
          r: r
        });
      }
    }
  });

  return territories;
}

// Create AI players for each faction
async function createAIPlayers() {
  try {
    const nations = ['union', 'dominion', 'syndicate'];
    const aiNames = [
      'Commander Alpha', 'General Beta', 'Colonel Gamma',
      'Major Delta', 'Captain Epsilon', 'Lieutenant Zeta'
    ];

    for (const nation of nations) {
      // Check if AI players already exist for this nation
      const [existing] = await pool.execute(
        'SELECT COUNT(*) as count FROM players WHERE nation = ? AND is_ai = TRUE',
        [nation]
      );

      if (existing[0].count >= 3) continue; // Already have enough AI players

      // Create 3 AI players per faction
      for (let i = 0; i < 3; i++) {
        const aiName = `${aiNames[i]} (${nation.toUpperCase()})`;
        const aiEmail = `ai_${nation}_${i + 1}@frontline.ai`;
        const aiPassword = await bcrypt.hash('ai_password_' + Math.random(), 10);

        try {
          const [result] = await pool.execute(
            'INSERT INTO players (email, username, password_hash, nation, is_ai) VALUES (?, ?, ?, ?, TRUE)',
            [aiEmail, aiName, aiPassword, nation]
          );

          // Create AI plot
          const plotId = `${nation}_ai_${Date.now()}_${result.insertId}`;
          const resourceTypes = ['manpower', 'materials', 'fuel', 'food'];
          const specialization = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];

          await pool.execute(`
            INSERT INTO plots (id, player_id, nation, hex_id, resource_specialization, population_cap)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [plotId, result.insertId, nation, `hex_ai_${Math.random().toString(36).substr(2, 9)}`, specialization, 50]);

          // Update player with plot_id
          await pool.execute(
            'UPDATE players SET plot_id = ? WHERE id = ?',
            [plotId, result.insertId]
          );

          // Create AI headquarters
          await pool.execute(`
            INSERT INTO buildings (id, plot_id, type, name, level, max_level, is_under_construction, can_cancel)
            VALUES (?, ?, 'headquarters', 'AI Command Center', 1, 50, FALSE, FALSE)
          `, [`hq_${plotId}`, plotId]);

          console.log(`Created AI player: ${aiName}`);
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY') {
            console.error(`Error creating AI player ${aiName}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error creating AI players:', error);
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('Database connected successfully');
    console.log('Creating tables...');
    
    const connection = await pool.getConnection();
    
    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.query(`USE ${dbConfig.database}`);
    
    // Players table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nation ENUM('union', 'dominion', 'syndicate') DEFAULT NULL,
        plot_id VARCHAR(100) DEFAULT NULL,
        role ENUM('player', 'admin') DEFAULT 'player',
        is_ai BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        stats_troops_trained INT DEFAULT 0,
        stats_kills INT DEFAULT 0,
        stats_resources_earned INT DEFAULT 0,
        stats_contributions INT DEFAULT 0
      )
    `);
    
    // Plots table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS plots (
        id VARCHAR(100) PRIMARY KEY,
        player_id INT NOT NULL,
        nation ENUM('union', 'dominion', 'syndicate') NOT NULL,
        hex_id VARCHAR(100) NOT NULL,
        resource_specialization ENUM('manpower', 'materials', 'fuel', 'food') NOT NULL,
        population_current INT DEFAULT 0,
        population_cap INT DEFAULT 50,
        manpower INT DEFAULT 100,
        materials INT DEFAULT 50,
        fuel INT DEFAULT 25,
        food INT DEFAULT 30,
        last_resource_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_population_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);
    
    // Buildings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS buildings (
        id VARCHAR(100) PRIMARY KEY,
        plot_id VARCHAR(100) NOT NULL,
        type ENUM('headquarters', 'barracks', 'factory', 'depot', 'radar', 'industry', 'farm', 'infrastructure', 'housing', 'storage', 'federal') NOT NULL,
        name VARCHAR(100) NOT NULL,
        level INT DEFAULT 1,
        max_level INT DEFAULT 50,
        is_under_construction BOOLEAN DEFAULT FALSE,
        construction_start TIMESTAMP NULL,
        construction_end TIMESTAMP NULL,
        is_upgrading BOOLEAN DEFAULT FALSE,
        upgrade_end TIMESTAMP NULL,
        can_cancel BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE CASCADE
      )
    `);
    
    // Troops table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS troops (
        id VARCHAR(100) PRIMARY KEY,
        plot_id VARCHAR(100) NOT NULL,
        type ENUM('infantry', 'armor', 'artillery', 'air') NOT NULL,
        name VARCHAR(100) NOT NULL,
        count INT DEFAULT 0,
        strength INT DEFAULT 1,
        morale INT DEFAULT 100,
        is_training BOOLEAN DEFAULT FALSE,
        training_start TIMESTAMP NULL,
        training_end TIMESTAMP NULL,
        is_deployed BOOLEAN DEFAULT FALSE,
        deployment_end TIMESTAMP NULL,
        target_hex VARCHAR(100) NULL,
        upkeep_food INT DEFAULT 0,
        upkeep_fuel INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE CASCADE
      )
    `);
    
    // Construction queue table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS construction_queue (
        id VARCHAR(100) PRIMARY KEY,
        plot_id VARCHAR(100) NOT NULL,
        building_id VARCHAR(100) NOT NULL,
        queue_position INT NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE CASCADE,
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
      )
    `);
    
    // Supply convoys table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS supply_convoys (
        id VARCHAR(100) PRIMARY KEY,
        from_plot_id VARCHAR(100) NOT NULL,
        to_plot_id VARCHAR(100) NOT NULL,
        resource_type ENUM('manpower', 'materials', 'fuel', 'food') NOT NULL,
        amount INT NOT NULL,
        status ENUM('preparing', 'in_transit', 'delivered', 'intercepted') DEFAULT 'preparing',
        departure_time TIMESTAMP NULL,
        arrival_time TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_plot_id) REFERENCES plots(id) ON DELETE CASCADE,
        FOREIGN KEY (to_plot_id) REFERENCES plots(id) ON DELETE CASCADE
      )
    `);

    // Territories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS territories (
        id VARCHAR(100) PRIMARY KEY,
        hex_id VARCHAR(100) NOT NULL UNIQUE,
        controlled_by_nation ENUM('union', 'dominion', 'syndicate', 'neutral') DEFAULT 'neutral',
        controlled_by_player INT NULL,
        is_contested BOOLEAN DEFAULT FALSE,
        under_attack BOOLEAN DEFAULT FALSE,
        last_battle TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (controlled_by_player) REFERENCES players(id) ON DELETE SET NULL
      )
    `);

    // Trades table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS trades (
        id VARCHAR(100) PRIMARY KEY,
        from_player_id INT NOT NULL,
        to_player_id INT NOT NULL,
        offered_resource ENUM('manpower', 'materials', 'fuel', 'food') NOT NULL,
        offered_amount INT NOT NULL,
        requested_resource ENUM('manpower', 'materials', 'fuel', 'food') NOT NULL,
        requested_amount INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected', 'expired') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR),
        FOREIGN KEY (from_player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (to_player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

    // Player actions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS player_actions (
        id VARCHAR(100) PRIMARY KEY,
        player_id INT NOT NULL,
        action_type ENUM('move', 'attack', 'occupy') NOT NULL,
        from_hex VARCHAR(100) NULL,
        to_hex VARCHAR(100) NOT NULL,
        troop_data JSON NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completes_at TIMESTAMP NOT NULL,
        status ENUM('in_progress', 'completed', 'cancelled') DEFAULT 'in_progress',
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);
    
    connection.release();
    console.log('Database initialized successfully');

    // Initialize territories with proper faction distribution
    await initializeTerritories();
    
    // Create AI players
    await createAIPlayers();
    
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize territories with balanced faction distribution
async function initializeTerritories() {
  try {
    const connection = await pool.getConnection();
    
    // Check if territories already exist
    const [existingTerritories] = await connection.execute('SELECT COUNT(*) as count FROM territories');
    if (existingTerritories[0].count > 0) {
      connection.release();
      return; // Territories already initialized
    }

    // Generate balanced hex map with proper faction distribution
    const territories = generateBalancedTerritories();
    
    // Insert territories into database
    for (const territory of territories) {
      await connection.execute(`
        INSERT INTO territories (id, hex_id, controlled_by_nation, is_contested, under_attack)
        VALUES (?, ?, ?, FALSE, FALSE)
      `, [territory.id, territory.hex_id, territory.nation]);
    }
    
    connection.release();
    console.log(`Initialized ${territories.length} territories with balanced faction distribution`);
    
  } catch (error) {
    console.error('Territory initialization error:', error);
  }
}

// Setup WebSocket
const { broadcastUpdate, broadcastToAll } = setupWebSocket(server, JWT_SECRET);

// Setup routes
app.use('/api/auth', createAuthRoutes(pool, JWT_SECRET));
app.use('/api/trades', createTradeRoutes(pool, authenticateToken));
app.use('/api/admin', createAdminRoutes(pool, gameSettings, authenticateToken, requireAdmin, generateBalancedTerritories, createAIPlayers));

// Game data routes
app.get('/api/game/territories', async (req, res) => {
  try {
    const [territories] = await pool.execute('SELECT * FROM territories ORDER BY hex_id');
    res.json({ territories });
  } catch (error) {
    console.error('Get territories error:', error);
    res.status(500).json({ error: 'Failed to get territories' });
  }
});

app.get('/api/game/nations', async (req, res) => {
  try {
    // Get territory counts for each nation
    const [territoryCounts] = await pool.execute(`
      SELECT controlled_by_nation as nation, COUNT(*) as territory_count
      FROM territories 
      GROUP BY controlled_by_nation
    `);

    // Get player counts for each nation
    const [playerCounts] = await pool.execute(`
      SELECT nation, COUNT(*) as player_count
      FROM players 
      WHERE nation IS NOT NULL AND is_ai = FALSE
      GROUP BY nation
    `);

    const nations = [
      {
        id: 'union',
        name: 'Northern Union',
        color: 'blue',
        description: 'A democratic federation controlling the resource-rich northern territories.',
        territories: territoryCounts.find(t => t.nation === 'union')?.territory_count || 0,
        totalPlayers: playerCounts.find(p => p.nation === 'union')?.player_count || 0,
        leader: 'General Marcus Steel',
        resources: { pooledMaterials: 15000, pooledFuel: 8000, warPoints: 2340 },
        research: { militaryDoctrine: 3, advancedWeaponry: 2, logistics: 4 },
        government: { president: 'President Sarah Chen', general: 'General Marcus Steel', minister: 'Minister Elena Ross' }
      },
      {
        id: 'dominion',
        name: 'Eastern Dominion',
        color: 'red',
        description: 'An authoritarian empire spanning the eastern archipelago.',
        territories: territoryCounts.find(t => t.nation === 'dominion')?.territory_count || 0,
        totalPlayers: playerCounts.find(p => p.nation === 'dominion')?.player_count || 0,
        leader: 'Marshal Viktor Kane',
        resources: { pooledMaterials: 18000, pooledFuel: 12000, warPoints: 2890 },
        research: { militaryDoctrine: 4, advancedWeaponry: 3, logistics: 2 },
        government: { president: 'Supreme Leader Viktor Kane', general: 'Marshal Elena Volkov', minister: 'Minister Dmitri Kozlov' }
      },
      {
        id: 'syndicate',
        name: 'Southern Syndicate',
        color: 'green',
        description: 'A corporate alliance controlling the southern industrial heartland.',
        territories: territoryCounts.find(t => t.nation === 'syndicate')?.territory_count || 0,
        totalPlayers: playerCounts.find(p => p.nation === 'syndicate')?.player_count || 0,
        leader: 'Executive Director Sarah Chen',
        resources: { pooledMaterials: 12000, pooledFuel: 15000, warPoints: 1980 },
        research: { militaryDoctrine: 2, advancedWeaponry: 4, logistics: 3 },
        government: { president: 'CEO Marcus Webb', general: 'Director of Operations Lisa Park', minister: 'Chief Financial Officer Alex Kim' }
      }
    ];

    res.json({ nations });
  } catch (error) {
    console.error('Get nations error:', error);
    res.status(500).json({ error: 'Failed to get nations' });
  }
});

// Player actions routes
app.get('/api/player/actions', authenticateToken, async (req, res) => {
  try {
    const [actions] = await pool.execute(`
      SELECT * FROM player_actions 
      WHERE status = 'in_progress' OR (status = 'completed' AND completes_at > DATE_SUB(NOW(), INTERVAL 1 HOUR))
      ORDER BY started_at DESC
    `);
    
    res.json({ 
      actions: actions.map(action => {
        let troopData = null;
        if (action.troop_data) {
          try {
            troopData = typeof action.troop_data === 'string' 
              ? JSON.parse(action.troop_data) 
              : action.troop_data;
          } catch (error) {
            console.error('Error parsing troop data for action', action.id, ':', error);
            troopData = { totalUnits: 1, totalStrength: 10 };
          }
        }
        
        return {
          id: action.id,
          playerId: action.player_id,
          actionType: action.action_type,
          fromHex: action.from_hex,
          toHex: action.to_hex,
          troopData: troopData,
          startedAt: new Date(action.started_at).getTime(),
          completesAt: new Date(action.completes_at).getTime(),
          status: action.status
        };
      })
    });
  } catch (error) {
    console.error('Get player actions error:', error);
    res.status(500).json({ error: 'Failed to get player actions' });
  }
});

// Battle stats route
app.get('/api/game/battle-stats', async (req, res) => {
  try {
    const [activeBattles] = await pool.execute(`
      SELECT COUNT(*) as count FROM player_actions 
      WHERE action_type = 'attack' AND status = 'in_progress'
    `);
    
    const [recentVictories] = await pool.execute(`
      SELECT COUNT(*) as count FROM player_actions 
      WHERE action_type = 'attack' AND status = 'completed' 
      AND completes_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    res.json({
      stats: {
        activeBattles: activeBattles[0].count,
        recentVictories: recentVictories[0].count,
        territoriesLost: Math.floor(Math.random() * 5), // Mock data
        territoriesGained: Math.floor(Math.random() * 8) // Mock data
      }
    });
  } catch (error) {
    console.error('Get battle stats error:', error);
    res.status(500).json({ error: 'Failed to get battle stats' });
  }
});

// Collect resources route
app.post('/api/player/collect-resources', authenticateToken, async (req, res) => {
  try {
    const playerId = req.user.id;

    // Get player plot
    const [plotRows] = await pool.execute(
      'SELECT * FROM plots WHERE player_id = ?',
      [playerId]
    );

    if (plotRows.length === 0) {
      return res.status(404).json({ error: 'Plot not found' });
    }

    const plot = plotRows[0];

    // --- Cooldown Logic ---
    const now = Date.now();
    const lastCollect = plot.last_collect_time ? new Date(plot.last_collect_time).getTime() : 0;
    const cooldown = 10 * 60 * 1000; // 10 minutes
    const timeSinceLast = now - lastCollect;

    if (timeSinceLast < cooldown) {
      const waitMs = cooldown - timeSinceLast;
      return res.status(429).json({
        error: 'Cooldown active. Please wait before collecting again.',
        cooldown_remaining_ms: waitMs
      });
    }

    // --- Calculate bonus (10%) ---
    const bonusManpower = Math.floor(plot.manpower * 0.1);
    const bonusMaterials = Math.floor(plot.materials * 0.1);
    const bonusFuel = Math.floor(plot.fuel * 0.1);
    const bonusFood = Math.floor(plot.food * 0.1);

    // --- Storage cap ---
    const [storageRows] = await pool.execute(
      'SELECT COUNT(*) as storage_count FROM buildings WHERE plot_id = ? AND type = "storage" AND is_under_construction = FALSE',
      [plot.id]
    );
    const storageCap = 1000 + (storageRows[0].storage_count * 500);

    // --- Apply bonuses (respecting cap) ---
    const newManpower = Math.min(storageCap, plot.manpower + bonusManpower);
    const newMaterials = Math.min(storageCap, plot.materials + bonusMaterials);
    const newFuel = Math.min(storageCap, plot.fuel + bonusFuel);
    const newFood = Math.min(storageCap, plot.food + bonusFood);

    // ✅ FIXED: Proper SQL syntax
    await pool.execute(`
      UPDATE plots SET 
        manpower = ?, materials = ?, fuel = ?, food = ?, last_collect_time = NOW()
      WHERE id = ?
    `, [newManpower, newMaterials, newFuel, newFood, plot.id]);

    res.json({
      success: true,
      collected: {
        manpower: bonusManpower,
        materials: bonusMaterials,
        fuel: bonusFuel,
        food: bonusFood
      }
    });
  } catch (error) {
    console.error('Collect resources error:', error);
    res.status(500).json({ error: 'Failed to collect resources' });
  }
});

// Existing player routes (keeping the same structure)
app.post('/api/player/select-nation', authenticateToken, async (req, res) => {
  try {
    const { nationId } = req.body;
    const playerId = req.user.id;
    
    // Generate plot ID and assign resource specialization
    const plotId = `${nationId}_${Date.now()}_${playerId}`;
    const resourceTypes = ['manpower', 'materials', 'fuel', 'food'];
    const specialization = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
    
    // Update player nation
    await pool.execute(
      'UPDATE players SET nation = ?, plot_id = ? WHERE id = ?',
      [nationId, plotId, playerId]
    );
    
    // Create plot
    await pool.execute(`
      INSERT INTO plots (id, player_id, nation, hex_id, resource_specialization, population_cap)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [plotId, playerId, nationId, `hex_${Math.random().toString(36).substr(2, 9)}`, specialization, 50]);
    
    // Create initial headquarters
    await pool.execute(`
      INSERT INTO buildings (id, plot_id, type, name, level, max_level, is_under_construction, can_cancel)
      VALUES (?, ?, 'headquarters', 'Command Center', 1, 50, FALSE, FALSE)
    `, [`hq_${plotId}`, plotId]);
    
    res.json({ success: true, plotId, specialization });
  } catch (error) {
    console.error('Nation selection error:', error);
    res.status(500).json({ error: 'Failed to select nation' });
  }
});

app.get('/api/player/plot', authenticateToken, async (req, res) => {
  try {
    const playerId = req.user.id;
    
    // Get plot
    const [plotRows] = await pool.execute(
      'SELECT * FROM plots WHERE player_id = ?',
      [playerId]
    );
    
    if (plotRows.length === 0) {
      return res.json({ plot: null });
    }
    
    const plot = plotRows[0];
    
    // Get buildings
    const [buildings] = await pool.execute(
      'SELECT * FROM buildings WHERE plot_id = ? ORDER BY created_at',
      [plot.id]
    );
    
    // Get troops
    const [troops] = await pool.execute(
      'SELECT * FROM troops WHERE plot_id = ? ORDER BY created_at',
      [plot.id]
    );
    
    // Get construction queue
    const [queue] = await pool.execute(`
      SELECT cq.*, b.* FROM construction_queue cq
      JOIN buildings b ON cq.building_id = b.id
      WHERE cq.plot_id = ?
      ORDER BY cq.queue_position
    `, [plot.id]);
    
    res.json({
      plot: {
        id: plot.id,
        userId: plot.player_id,
        nation: plot.nation,
        hexId: plot.hex_id,
        resourceSpecialization: plot.resource_specialization,
        population: {
          current: plot.population_current,
          cap: plot.population_cap
        },
        resources: {
          manpower: plot.manpower,
          materials: plot.materials,
          fuel: plot.fuel,
          food: plot.food
        },
        buildings: buildings.map(b => ({
          id: b.id,
          type: b.type,
          name: b.name,
          level: b.level,
          maxLevel: b.max_level,
          isUnderConstruction: b.is_under_construction,
          constructionEnd: b.construction_end ? new Date(b.construction_end).getTime() : null,
          isUpgrading: b.is_upgrading,
          upgradeEnd: b.upgrade_end ? new Date(b.upgrade_end).getTime() : null,
          canCancel: b.can_cancel
        })),
        troops: troops.map(t => ({
          id: t.id,
          type: t.type,
          name: t.name,
          count: t.count,
          strength: t.strength,
          morale: t.morale,
          isTraining: t.is_training,
          trainingEnd: t.training_end ? new Date(t.training_end).getTime() : null,
          isDeployed: t.is_deployed,
          deploymentEnd: t.deployment_end ? new Date(t.deployment_end).getTime() : null,
          targetHex: t.target_hex,
          upkeepFood: t.upkeep_food,
          upkeepFuel: t.upkeep_fuel
        })),
        buildQueue: queue.map(q => ({
          id: q.building_id,
          type: q.type,
          name: q.name,
          level: q.level,
          maxLevel: q.max_level,
          isUnderConstruction: q.is_under_construction,
          constructionEnd: q.construction_end ? new Date(q.construction_end).getTime() : null,
          canCancel: q.can_cancel,
          queuePosition: q.queue_position
        })),
        lastResourceUpdate: plot.last_resource_update
      }
    });
  } catch (error) {
    console.error('Get plot error:', error);
    res.status(500).json({ error: 'Failed to get plot data' });
  }
});

// Building construction
app.post('/api/buildings/construct', authenticateToken, async (req, res) => {
  try {
    const { buildingType } = req.body;
    const playerId = req.user.id;
    
    // Get player plot
    const [plotRows] = await pool.execute(
      'SELECT * FROM plots WHERE player_id = ?',
      [playerId]
    );
    
    if (plotRows.length === 0) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    
    const plot = plotRows[0];
    
    // Check if already constructing
    const [queueRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM construction_queue WHERE plot_id = ?',
      [plot.id]
    );
    
    if (queueRows[0].count > 0) {
      return res.status(400).json({ error: 'Already constructing a building' });
    }
    
    // Building configurations
    const buildingConfigs = {
      barracks: { name: 'Barracks', time: 120000, cost: 30, prerequisites: [] },
      factory: { name: 'Factory', time: 180000, cost: 40, prerequisites: ['industry'] },
      depot: { name: 'Supply Depot', time: 90000, cost: 25, prerequisites: [] },
      radar: { name: 'Radar Station', time: 240000, cost: 50, prerequisites: ['infrastructure'] },
      industry: { name: 'Industrial Complex', time: 300000, cost: 60, prerequisites: [] },
      farm: { name: 'Agricultural Center', time: 150000, cost: 35, prerequisites: [] },
      infrastructure: { name: 'Infrastructure Node', time: 360000, cost: 80, prerequisites: [] },
      housing: { name: 'Housing Complex', time: 200000, cost: 45, prerequisites: [] },
      storage: { name: 'Storage Facility', time: 120000, cost: 30, prerequisites: [] },
      federal: { name: 'Federal Building', time: 480000, cost: 120, prerequisites: ['infrastructure'] }
    };
    
    const config = buildingConfigs[buildingType];
    if (!config) {
      return res.status(400).json({ error: 'Invalid building type' });
    }
    
    // Apply construction time modifier
    const adjustedTime = Math.floor(config.time * gameSettings.constructionTimeModifier);
    
    // Check prerequisites
    if (config.prerequisites.length > 0) {
      const [prereqRows] = await pool.execute(
        `SELECT COUNT(*) as count FROM buildings 
         WHERE plot_id = ? AND type IN (${config.prerequisites.map(() => '?').join(',')}) 
         AND is_under_construction = FALSE`,
        [plot.id, ...config.prerequisites]
      );
      
      if (prereqRows[0].count < config.prerequisites.length) {
        return res.status(400).json({ error: 'Prerequisites not met' });
      }
    }
    
    // Check resources
    if (plot.materials < config.cost) {
      return res.status(400).json({ error: 'Insufficient materials' });
    }
    
    // Check if building already exists (for unique buildings)
    const uniqueBuildings = ['headquarters', 'industry', 'infrastructure', 'federal'];
    if (uniqueBuildings.includes(buildingType)) {
      const [existingRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM buildings WHERE plot_id = ? AND type = ?',
        [plot.id, buildingType]
      );
      
      if (existingRows[0].count > 0) {
        return res.status(400).json({ error: 'Building already exists' });
      }
    }
    
    const buildingId = `${buildingType}_${Date.now()}`;
    const constructionEnd = new Date(Date.now() + adjustedTime);
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Deduct resources
      await connection.execute(
        'UPDATE plots SET materials = materials - ? WHERE id = ?',
        [config.cost, plot.id]
      );
      
      // Create building
      await connection.execute(`
        INSERT INTO buildings (id, plot_id, type, name, level, max_level, is_under_construction, construction_start, construction_end, can_cancel)
        VALUES (?, ?, ?, ?, 1, 50, TRUE, NOW(), ?, TRUE)
      `, [buildingId, plot.id, buildingType, config.name, constructionEnd]);
      
      // Add to construction queue
      await connection.execute(`
        INSERT INTO construction_queue (id, plot_id, building_id, queue_position)
        VALUES (?, ?, ?, 1)
      `, [`queue_${buildingId}`, plot.id, buildingId]);
      
      await connection.commit();
      connection.release();
      
      // Broadcast update to player
      broadcastUpdate(playerId, { type: 'plot_update' });
      
      res.json({ success: true, buildingId, constructionEnd: constructionEnd.getTime() });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Construction error:', error);
    res.status(500).json({ error: 'Construction failed' });
  }
});

// Building upgrade route - NEW
app.post('/api/buildings/upgrade', authenticateToken, async (req, res) => {
  try {
    const { buildingId } = req.body;
    const playerId = req.user.id;
    
    // Get building and verify ownership
    const [buildingRows] = await pool.execute(`
      SELECT b.*, p.player_id, p.materials 
      FROM buildings b
      JOIN plots p ON b.plot_id = p.id
      WHERE b.id = ? AND p.player_id = ?
    `, [buildingId, playerId]);
    
    if (buildingRows.length === 0) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    const building = buildingRows[0];
    
    // Check if building can be upgraded
    if (building.is_under_construction || building.is_upgrading) {
      return res.status(400).json({ error: 'Building is already under construction or upgrading' });
    }
    
    if (building.level >= building.max_level) {
      return res.status(400).json({ error: 'Building is already at maximum level' });
    }
    
    // Calculate upgrade cost (increases with level)
    const upgradeCost = Math.floor(30 * Math.pow(1.5, building.level));
    
    if (building.materials < upgradeCost) {
      return res.status(400).json({ error: 'Insufficient materials for upgrade' });
    }
    
    // Calculate upgrade time (2 minutes base + 30 seconds per level)
    const upgradeTime = 120000 + (building.level * 30000);
    const upgradeEnd = new Date(Date.now() + upgradeTime);
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Deduct resources
      await connection.execute(
        'UPDATE plots SET materials = materials - ? WHERE player_id = ?',
        [upgradeCost, playerId]
      );
      
      // Start upgrade
      await connection.execute(`
        UPDATE buildings SET 
          is_upgrading = TRUE,
          upgrade_end = ?
        WHERE id = ?
      `, [upgradeEnd, buildingId]);
      
      await connection.commit();
      connection.release();
      
      // Broadcast update to player
      broadcastUpdate(playerId, { type: 'plot_update' });
      
      res.json({ 
        success: true, 
        upgradeEnd: upgradeEnd.getTime(),
        cost: upgradeCost
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Upgrade failed' });
  }
});

// Train troops
app.post('/api/troops/train', authenticateToken, async (req, res) => {
  try {
    const { troopType, count } = req.body;
    const playerId = req.user.id;
    
    // Get player plot
    const [plotRows] = await pool.execute(
      'SELECT * FROM plots WHERE player_id = ?',
      [playerId]
    );
    
    if (plotRows.length === 0) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    
    const plot = plotRows[0];
    
    // Check population capacity
    if (plot.population_current + count > plot.population_cap) {
      return res.status(400).json({ error: 'Insufficient population capacity' });
    }
    
    //Troop configurations
    const troopConfigs = {
      infantry: { name: 'Infantry Squad', time: 60000, cost: 15, strength: 1, upkeepFood: 1, upkeepFuel: 0 },
      armor: { name: 'Armor Unit', time: 120000, cost: 25, strength: 3, upkeepFood: 0, upkeepFuel: 1 },
      artillery: { name: 'Artillery Battery', time: 180000, cost: 35, strength: 5, upkeepFood: 1, upkeepFuel: 1 },
      air: { name: 'Air Squadron', time: 240000, cost: 50, strength: 7, upkeepFood: 0, upkeepFuel: 2 }
    };
    
    const config = troopConfigs[troopType];
    if (!config) {
      return res.status(400).json({ error: 'Invalid troop type' });
    }
    
    const totalCost = config.cost * count;
    if (plot.manpower < totalCost) {
      return res.status(400).json({ error: 'Insufficient manpower' });
    }
    
    // Check for barracks
    const [barracksRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM buildings WHERE plot_id = ? AND type = "barracks" AND is_under_construction = FALSE',
      [plot.id]
    );
    
    if (barracksRows[0].count === 0) {
      return res.status(400).json({ error: 'Barracks required' });
    }
    
    const troopId = `${troopType}_${Date.now()}`;
    const trainingEnd = new Date(Date.now() + config.time * count);
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Deduct resources and update population
      await connection.execute(
        'UPDATE plots SET manpower = manpower - ?, population_current = population_current + ? WHERE id = ?',
        [totalCost, count, plot.id]
      );
      
      // Create or update troop
      const [existingTroops] = await connection.execute(
        'SELECT * FROM troops WHERE plot_id = ? AND type = ?',
        [plot.id, troopType]
      );
      
      if (existingTroops.length > 0) {
        // Update existing troop
        await connection.execute(`
          UPDATE troops SET 
            count = count + ?,
            is_training = TRUE,
            training_start = NOW(),
            training_end = ?,
            upkeep_food = upkeep_food + ?,
            upkeep_fuel = upkeep_fuel + ?
          WHERE id = ?
        `, [count, trainingEnd, config.upkeepFood * count, config.upkeepFuel * count, existingTroops[0].id]);
      } else {
        // Create new troop
        await connection.execute(`
          INSERT INTO troops (id, plot_id, type, name, count, strength, morale, is_training, training_start, training_end, upkeep_food, upkeep_fuel)
          VALUES (?, ?, ?, ?, ?, ?, 100, TRUE, NOW(), ?, ?, ?)
        `, [troopId, plot.id, troopType, config.name, count, config.strength, trainingEnd, config.upkeepFood * count, config.upkeepFuel * count]);
      }
      
      await connection.commit();
      connection.release();
      
      // Broadcast update to player
      broadcastUpdate(playerId, { type: 'plot_update' });
      
      res.json({ success: true, troopId, trainingEnd: trainingEnd.getTime() });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({ error: 'Training failed' });
  }
});

// Deploy troops - ENHANCED
app.post('/api/troops/deploy', authenticateToken, async (req, res) => {
  try {
    const { troops, targetHex, type } = req.body;
    const playerId = req.user.id;
    
    if (!troops || troops.length === 0) {
      return res.status(400).json({ error: 'No troops selected for deployment' });
    }
    
    // Get player plot and nation
    const [plotRows] = await pool.execute(`
      SELECT p.*, pl.nation 
      FROM plots p
      JOIN players pl ON p.player_id = pl.id
      WHERE p.player_id = ?
    `, [playerId]);
    
    if (plotRows.length === 0) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    
    const plot = plotRows[0];
    
    // Validate troop deployment
    let totalUnits = 0;
    let totalStrength = 0;
    
    for (const troopDeployment of troops) {
      const [troopRows] = await pool.execute(
        'SELECT * FROM troops WHERE id = ? AND plot_id = ? AND is_training = FALSE AND is_deployed = FALSE',
        [troopDeployment.troopId, plot.id]
      );
      
      if (troopRows.length === 0) {
        return res.status(400).json({ error: `Troop ${troopDeployment.troopId} not available for deployment` });
      }
      
      const troop = troopRows[0];
      if (troop.count < troopDeployment.count) {
        return res.status(400).json({ error: `Insufficient ${troop.name} units` });
      }
      
      totalUnits += troopDeployment.count;
      totalStrength += troop.strength * troopDeployment.count;
    }
    
    // Calculate deployment time (5-15 minutes based on distance)
    const deploymentTime = Math.floor(Math.random() * 600000) + 300000; // 5-15 minutes
    const deploymentEnd = new Date(Date.now() + deploymentTime);
    
    // Create player action
    const actionId = `action_${Date.now()}_${playerId}`;
    const troopData = {
      totalUnits,
      totalStrength,
      deployedTroops: troops
    };
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create player action
      await connection.execute(`
        INSERT INTO player_actions (id, player_id, action_type, from_hex, to_hex, troop_data, completes_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [actionId, playerId, type === 'attack' ? 'attack' : 'occupy', plot.hex_id, targetHex, JSON.stringify(troopData), deploymentEnd]);
      
      // Mark troops as deployed
      for (const troopDeployment of troops) {
        await connection.execute(`
          UPDATE troops SET 
            count = count - ?,
            is_deployed = TRUE,
            deployment_end = ?,
            target_hex = ?
          WHERE id = ?
        `, [troopDeployment.count, deploymentEnd, targetHex, troopDeployment.troopId]);
      }
      
      // Update population
      await connection.execute(
        'UPDATE plots SET population_current = population_current - ? WHERE id = ?',
        [totalUnits, plot.id]
      );
      
      await connection.commit();
      connection.release();
      
      // Broadcast update to player
      broadcastUpdate(playerId, { type: 'plot_update' });
      broadcastToAll({ type: 'map_update' }); // Notify all players of new movement
      
      res.json({ 
        success: true, 
        actionId,
        deploymentEnd: deploymentEnd.getTime(),
        totalUnits,
        totalStrength
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Deploy troops error:', error);
    res.status(500).json({ error: 'Deployment failed' });
  }
});

// Setup timers and AI with deployment processing
setupTimers(pool, gameSettings, broadcastToAll);
setupAI(pool, gameSettings, broadcastToAll);

// Start deployment processing timer
setInterval(processCompletedDeployments, 30000); // Check every 30 seconds

const PORT = process.env.PORT || 3001;

// Start server
async function startServer() {
  await initializeDatabase();
  
  server.listen(PORT, () => {
    console.log(`🚀 FRONTLINE: Online server running on port ${PORT}`);
  });
}

startServer().catch(console.error);