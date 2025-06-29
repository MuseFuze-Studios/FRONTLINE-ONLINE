// AI Player Logic System
export function setupAI(pool, gameSettings, broadcastToAll) {
  
  // AI decision making logic
  async function makeAIDecisions() {
    try {
      const [aiPlayers] = await pool.execute(`
        SELECT p.*, pl.* FROM players p
        JOIN plots pl ON p.plot_id = pl.id
        WHERE p.is_ai = TRUE AND p.nation IS NOT NULL
      `);

      for (const ai of aiPlayers) {
        await processAIPlayer(ai);
      }
    } catch (error) {
      console.error('AI decision making error:', error);
    }
  }

  async function processAIPlayer(ai) {
    // AI resource management
    await manageAIResources(ai);
    
    // AI trading decisions
    await makeAITrades(ai);
    
    // AI building decisions
    await makeAIBuildings(ai);
    
    // AI troop decisions
    await makeAITroops(ai);
  }

  async function manageAIResources(ai) {
    // Check if AI needs resources
    const resourceNeeds = {
      manpower: ai.manpower < 50,
      materials: ai.materials < 30,
      fuel: ai.fuel < 20,
      food: ai.food < 25
    };

    // If AI has surplus of specialized resource, consider trading
    const surplus = ai[ai.resource_specialization] > 200;
    if (surplus) {
      const neededResource = Object.keys(resourceNeeds).find(r => resourceNeeds[r] && r !== ai.resource_specialization);
      if (neededResource) {
        await createAITrade(ai, neededResource);
      }
    }
  }

  async function createAITrade(ai, neededResource) {
    try {
      // Find potential trading partners
      const [potentialPartners] = await pool.execute(`
        SELECT p.id, pl.${neededResource} as resource_amount
        FROM players p
        JOIN plots pl ON p.plot_id = pl.id
        WHERE p.id != ? AND pl.${neededResource} > 100
        ORDER BY pl.${neededResource} DESC
        LIMIT 5
      `, [ai.id]);

      if (potentialPartners.length === 0) return;

      const partner = potentialPartners[0];
      const offeredAmount = Math.min(50, Math.floor(ai[ai.resource_specialization] * 0.3));
      const requestedAmount = Math.min(30, Math.floor(partner.resource_amount * 0.2));

      // Create trade offer
      const tradeId = `ai_trade_${Date.now()}_${ai.id}`;
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

      await pool.execute(`
        INSERT INTO trades (id, from_player_id, to_player_id, offered_resource, offered_amount, requested_resource, requested_amount, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [tradeId, ai.id, partner.id, ai.resource_specialization, offeredAmount, neededResource, requestedAmount, expiresAt]);

      console.log(`AI ${ai.username} created trade: ${offeredAmount} ${ai.resource_specialization} for ${requestedAmount} ${neededResource}`);
    } catch (error) {
      console.error('AI trade creation error:', error);
    }
  }

  async function makeAIBuildings(ai) {
    try {
      // Check if AI is already building
      const [buildingCheck] = await pool.execute(
        'SELECT COUNT(*) as count FROM construction_queue WHERE plot_id = ?',
        [ai.plot_id]
      );

      if (buildingCheck[0].count > 0) return; // Already building

      // Get current buildings
      const [buildings] = await pool.execute(
        'SELECT type FROM buildings WHERE plot_id = ? AND is_under_construction = FALSE',
        [ai.plot_id]
      );

      const hasBuilding = (type) => buildings.some(b => b.type === type);

      // AI building priority logic
      let buildingToBuild = null;

      if (!hasBuilding('barracks') && ai.materials >= 30) {
        buildingToBuild = 'barracks';
      } else if (!hasBuilding('industry') && ai.materials >= 60) {
        buildingToBuild = 'industry';
      } else if (!hasBuilding('farm') && ai.materials >= 35) {
        buildingToBuild = 'farm';
      } else if (!hasBuilding('housing') && ai.materials >= 45) {
        buildingToBuild = 'housing';
      } else if (!hasBuilding('storage') && ai.materials >= 30) {
        buildingToBuild = 'storage';
      }

      if (buildingToBuild) {
        await startAIBuilding(ai, buildingToBuild);
      }
    } catch (error) {
      console.error('AI building decision error:', error);
    }
  }

  async function startAIBuilding(ai, buildingType) {
    try {
      const buildingConfigs = {
        barracks: { name: 'AI Barracks', time: 120000, cost: 30 },
        industry: { name: 'AI Industrial Complex', time: 300000, cost: 60 },
        farm: { name: 'AI Agricultural Center', time: 150000, cost: 35 },
        housing: { name: 'AI Housing Complex', time: 200000, cost: 45 },
        storage: { name: 'AI Storage Facility', time: 120000, cost: 30 }
      };

      const config = buildingConfigs[buildingType];
      if (!config || ai.materials < config.cost) return;

      const buildingId = `ai_${buildingType}_${Date.now()}`;
      const constructionEnd = new Date(Date.now() + Math.floor(config.time * gameSettings.constructionTimeModifier));

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Deduct resources
        await connection.execute(
          'UPDATE plots SET materials = materials - ? WHERE id = ?',
          [config.cost, ai.plot_id]
        );

        // Create building
        await connection.execute(`
          INSERT INTO buildings (id, plot_id, type, name, level, max_level, is_under_construction, construction_start, construction_end, can_cancel)
          VALUES (?, ?, ?, ?, 1, 50, TRUE, NOW(), ?, FALSE)
        `, [buildingId, ai.plot_id, buildingType, config.name, constructionEnd]);

        // Add to construction queue
        await connection.execute(`
          INSERT INTO construction_queue (id, plot_id, building_id, queue_position)
          VALUES (?, ?, ?, 1)
        `, [`queue_${buildingId}`, ai.plot_id, buildingId]);

        await connection.commit();
        connection.release();

        console.log(`AI ${ai.username} started building ${buildingType}`);
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('AI building start error:', error);
    }
  }

  async function makeAITroops(ai) {
    try {
      // Check if AI has barracks and can train troops
      const [barracksCheck] = await pool.execute(
        'SELECT COUNT(*) as count FROM buildings WHERE plot_id = ? AND type = "barracks" AND is_under_construction = FALSE',
        [ai.plot_id]
      );

      if (barracksCheck[0].count === 0) return;

      // Check if already training
      const [trainingCheck] = await pool.execute(
        'SELECT COUNT(*) as count FROM troops WHERE plot_id = ? AND is_training = TRUE',
        [ai.plot_id]
      );

      if (trainingCheck[0].count > 0) return;

      // Check population capacity
      if (ai.population_current >= ai.population_cap) return;

      // AI prefers infantry early, then diversifies
      const troopTypes = ['infantry', 'armor', 'artillery'];
      const troopCosts = { infantry: 15, armor: 25, artillery: 35 };

      for (const troopType of troopTypes) {
        const cost = troopCosts[troopType];
        if (ai.manpower >= cost * 2) { // Train 2 units
          await startAITroopTraining(ai, troopType, 2);
          break;
        }
      }
    } catch (error) {
      console.error('AI troop decision error:', error);
    }
  }

  async function startAITroopTraining(ai, troopType, count) {
    try {
      const troopConfigs = {
        infantry: { name: 'AI Infantry Squad', time: 60000, cost: 15, strength: 1, upkeepFood: 1, upkeepFuel: 0 },
        armor: { name: 'AI Armor Unit', time: 120000, cost: 25, strength: 3, upkeepFood: 0, upkeepFuel: 1 },
        artillery: { name: 'AI Artillery Battery', time: 180000, cost: 35, strength: 5, upkeepFood: 1, upkeepFuel: 1 }
      };

      const config = troopConfigs[troopType];
      const totalCost = config.cost * count;

      if (ai.manpower < totalCost) return;

      const troopId = `ai_${troopType}_${Date.now()}`;
      const trainingEnd = new Date(Date.now() + config.time * count);

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Deduct resources and update population
        await connection.execute(
          'UPDATE plots SET manpower = manpower - ?, population_current = population_current + ? WHERE id = ?',
          [totalCost, count, ai.plot_id]
        );

        // Create or update troop
        const [existingTroops] = await connection.execute(
          'SELECT * FROM troops WHERE plot_id = ? AND type = ?',
          [ai.plot_id, troopType]
        );

        if (existingTroops.length > 0) {
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
          await connection.execute(`
            INSERT INTO troops (id, plot_id, type, name, count, strength, morale, is_training, training_start, training_end, upkeep_food, upkeep_fuel)
            VALUES (?, ?, ?, ?, ?, ?, 100, TRUE, NOW(), ?, ?, ?)
          `, [troopId, ai.plot_id, troopType, config.name, count, config.strength, trainingEnd, config.upkeepFood * count, config.upkeepFuel * count]);
        }

        await connection.commit();
        connection.release();

        console.log(`AI ${ai.username} started training ${count} ${troopType}`);
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('AI troop training error:', error);
    }
  }

  // AI accepts incoming trades based on logic
  async function processAITradeResponses() {
    try {
      const [incomingTrades] = await pool.execute(`
        SELECT t.*, p.username, pl.* FROM trades t
        JOIN players p ON t.to_player_id = p.id
        JOIN plots pl ON p.plot_id = pl.id
        WHERE p.is_ai = TRUE AND t.status = 'pending' AND t.expires_at > NOW()
      `);

      for (const trade of incomingTrades) {
        const shouldAccept = evaluateTradeForAI(trade);
        
        if (shouldAccept) {
          await acceptAITrade(trade);
        } else if (Math.random() < 0.1) { // 10% chance to reject
          await rejectAITrade(trade);
        }
      }
    } catch (error) {
      console.error('AI trade response error:', error);
    }
  }

  function evaluateTradeForAI(trade) {
    // AI accepts if:
    // 1. They need the offered resource
    // 2. They have surplus of requested resource
    // 3. The trade ratio is reasonable
    
    const aiNeedsOffered = trade[trade.offered_resource] < 50;
    const aiHasSurplus = trade[trade.requested_resource] > 100;
    const reasonableRatio = trade.offered_amount >= trade.requested_amount * 0.8;
    
    return aiNeedsOffered && aiHasSurplus && reasonableRatio;
  }

  async function acceptAITrade(trade) {
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
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
          [trade.id]
        );

        await connection.commit();
        connection.release();

        console.log(`AI ${trade.username} accepted trade: ${trade.offered_amount} ${trade.offered_resource} for ${trade.requested_amount} ${trade.requested_resource}`);
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('AI trade acceptance error:', error);
    }
  }

  async function rejectAITrade(trade) {
    try {
      await pool.execute(
        'UPDATE trades SET status = "rejected" WHERE id = ?',
        [trade.id]
      );
      console.log(`AI ${trade.username} rejected trade`);
    } catch (error) {
      console.error('AI trade rejection error:', error);
    }
  }

  // Run AI decisions every 5 minutes
  const aiInterval = setInterval(async () => {
    await makeAIDecisions();
    await processAITradeResponses();
  }, 300000); // 5 minutes

  return aiInterval;
}