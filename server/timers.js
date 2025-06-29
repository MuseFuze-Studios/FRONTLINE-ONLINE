export function setupTimers(pool, gameSettings, broadcastToAll) {
  // Resource generation and timer system (every 10 seconds for responsive updates)
  const timerInterval = setInterval(async () => {
    try {
      const now = new Date();
      
      // Complete building upgrades (check every 10 seconds with 2-second buffer)
      const [completedUpgrades] = await pool.execute(`
        SELECT * FROM buildings
        WHERE is_upgrading = TRUE AND upgrade_end <= DATE_SUB(NOW(), INTERVAL 2 SECOND)
      `);
      
      if (completedUpgrades.length > 0) {
        console.log(`Completing ${completedUpgrades.length} building upgrades`);
        
        await pool.execute(`
          UPDATE buildings SET 
            is_upgrading = FALSE,
            upgrade_end = NULL,
            level = level + 1
          WHERE is_upgrading = TRUE AND upgrade_end <= DATE_SUB(NOW(), INTERVAL 2 SECOND)
        `);
        
        // Broadcast timer update
        broadcastToAll({ type: 'timer_update', data: { upgrades_completed: completedUpgrades.length } });
      }
      
      // Complete construction (check every 10 seconds with 2-second buffer)
      const [completedBuildings] = await pool.execute(`
        SELECT * FROM buildings
        WHERE is_under_construction = TRUE AND construction_end <= DATE_SUB(NOW(), INTERVAL 2 SECOND)
      `);
      
      if (completedBuildings.length > 0) {
        console.log(`Completing ${completedBuildings.length} buildings`);
        
        await pool.execute(`
          UPDATE buildings SET 
            is_under_construction = FALSE,
            construction_end = NULL,
            construction_start = NULL
          WHERE is_under_construction = TRUE AND construction_end <= DATE_SUB(NOW(), INTERVAL 2 SECOND)
        `);
        
        // Remove completed buildings from queue
        await pool.execute(`
          DELETE cq FROM construction_queue cq
          JOIN buildings b ON cq.building_id = b.id
          WHERE b.is_under_construction = FALSE
        `);
        
        // Recalculate population for affected plots
        for (const building of completedBuildings) {
          if (building.type === 'housing') {
            await recalculatePopulation(building.plot_id);
          }
        }
        
        // Broadcast timer update
        broadcastToAll({ type: 'timer_update', data: { construction_completed: completedBuildings.length } });
      }
      
      // Complete troop training (check every 10 seconds with 2-second buffer)
      const [completedTroops] = await pool.execute(`
        SELECT * FROM troops
        WHERE is_training = TRUE AND training_end <= DATE_SUB(NOW(), INTERVAL 2 SECOND)
      `);
      
      if (completedTroops.length > 0) {
        console.log(`Completing training for ${completedTroops.length} troop units`);
        
        await pool.execute(`
          UPDATE troops SET 
            is_training = FALSE,
            training_end = NULL,
            training_start = NULL
          WHERE is_training = TRUE AND training_end <= DATE_SUB(NOW(), INTERVAL 2 SECOND)
        `);
        
        // Recalculate population for affected plots
        const affectedPlots = [...new Set(completedTroops.map(t => t.plot_id))];
        for (const plotId of affectedPlots) {
          await recalculatePopulation(plotId);
        }
        
        // Broadcast timer update
        broadcastToAll({ type: 'timer_update', data: { training_completed: completedTroops.length } });
      }
      
      // Complete deployments and return troops - ENHANCED
      const [completedDeployments] = await pool.execute(`
        SELECT t.*, pa.action_type, pa.to_hex, pa.player_id as action_player_id,
               pl.nation as attacker_nation
        FROM troops t
        JOIN plots p ON t.plot_id = p.id
        JOIN players pl ON p.player_id = pl.id
        LEFT JOIN player_actions pa ON pa.to_hex = t.target_hex AND pa.player_id = pl.id AND pa.status = 'in_progress'
        WHERE t.is_deployed = TRUE AND t.deployment_end <= DATE_SUB(NOW(), INTERVAL 2 SECOND)
      `);
      
      if (completedDeployments.length > 0) {
        console.log(`Completing ${completedDeployments.length} deployments`);
        
        // Process each deployment for combat resolution
        for (const deployment of completedDeployments) {
          if (deployment.target_hex && deployment.action_type) {
            // Get or create target territory
            let [territoryRows] = await pool.execute(
              'SELECT * FROM territories WHERE hex_id = ?',
              [deployment.target_hex]
            );
            
            if (territoryRows.length === 0) {
              // Create neutral territory if it doesn't exist
              const territoryId = `territory_${Date.now()}_${deployment.target_hex}`;
              await pool.execute(`
                INSERT INTO territories (id, hex_id, controlled_by_nation, is_contested, under_attack)
                VALUES (?, ?, 'neutral', FALSE, FALSE)
              `, [territoryId, deployment.target_hex]);
              
              // Fetch the newly created territory
              [territoryRows] = await pool.execute(
                'SELECT * FROM territories WHERE hex_id = ?',
                [deployment.target_hex]
              );
            }
            
            const territory = territoryRows[0];
            
            // Combat resolution based on action type
            if (deployment.action_type === 'attack') {
              if (territory.controlled_by_nation === 'neutral') {
                // Capture neutral territory
                await pool.execute(`
                  UPDATE territories SET 
                    controlled_by_nation = ?, 
                    controlled_by_player = ?,
                    is_contested = FALSE,
                    under_attack = FALSE
                  WHERE hex_id = ?
                `, [deployment.attacker_nation, deployment.action_player_id, deployment.target_hex]);
                
                console.log(`Territory ${deployment.target_hex} captured by ${deployment.attacker_nation}`);
              } else if (territory.controlled_by_nation !== deployment.attacker_nation) {
                // Attack enemy territory - simple combat resolution
                const attackerStrength = deployment.count * deployment.strength;
                const defenderStrength = Math.floor(Math.random() * 20) + 10; // Random defender strength
                
                if (attackerStrength > defenderStrength) {
                  // Attacker wins - capture territory
                  await pool.execute(`
                    UPDATE territories SET 
                      controlled_by_nation = ?, 
                      controlled_by_player = ?,
                      is_contested = FALSE,
                      under_attack = FALSE
                    WHERE hex_id = ?
                  `, [deployment.attacker_nation, deployment.action_player_id, deployment.target_hex]);
                  
                  console.log(`Territory ${deployment.target_hex} conquered by ${deployment.attacker_nation}`);
                } else {
                  // Defender wins - mark as contested
                  await pool.execute(`
                    UPDATE territories SET 
                      is_contested = TRUE,
                      under_attack = FALSE
                    WHERE hex_id = ?
                  `, [deployment.target_hex]);
                  
                  // Apply casualties to attacking troops
                  const casualties = Math.floor(deployment.count * 0.3); // 30% casualties
                  await pool.execute(`
                    UPDATE troops SET count = GREATEST(0, count - ?) WHERE id = ?
                  `, [casualties, deployment.id]);
                  
                  console.log(`Attack on ${deployment.target_hex} repelled - ${casualties} casualties`);
                }
              }
            } else if (deployment.action_type === 'occupy') {
              // Reinforce friendly or neutral territory
              if (territory.controlled_by_nation === deployment.attacker_nation || territory.controlled_by_nation === 'neutral') {
                await pool.execute(`
                  UPDATE territories SET 
                    controlled_by_nation = ?, 
                    controlled_by_player = ?,
                    is_contested = FALSE,
                    under_attack = FALSE
                  WHERE hex_id = ?
                `, [deployment.attacker_nation, deployment.action_player_id, deployment.target_hex]);
                
                console.log(`Territory ${deployment.target_hex} reinforced by ${deployment.attacker_nation}`);
              }
            }
          }
        }
        
        // Return troops to base - CRITICAL FIX
        await pool.execute(`
          UPDATE troops SET 
            is_deployed = FALSE,
            deployment_end = NULL,
            target_hex = NULL
          WHERE is_deployed = TRUE AND deployment_end <= DATE_SUB(NOW(), INTERVAL 2 SECOND)
        `);
        
        // Complete corresponding player actions
        await pool.execute(`
          UPDATE player_actions SET status = 'completed'
          WHERE status = 'in_progress' AND completes_at <= DATE_SUB(NOW(), INTERVAL 2 SECOND)
        `);
        
        // Recalculate population for affected plots (troops are now back)
        const affectedPlots = [...new Set(completedDeployments.map(t => t.plot_id))];
        for (const plotId of affectedPlots) {
          await recalculatePopulation(plotId);
        }
        
        broadcastToAll({ type: 'timer_update', data: { deployments_completed: completedDeployments.length } });
        broadcastToAll({ type: 'map_update' }); // Update map for territory changes
      }
      
      // Update resource generation every 2 minutes (IMPROVED FOOD GENERATION)
      const [plots] = await pool.execute(`
        SELECT p.*, 
          (SELECT COUNT(*) FROM buildings WHERE plot_id = p.id AND type = 'industry' AND is_under_construction = FALSE) as industry_count,
          (SELECT COUNT(*) FROM buildings WHERE plot_id = p.id AND type = 'farm' AND is_under_construction = FALSE) as farm_count,
          (SELECT COUNT(*) FROM buildings WHERE plot_id = p.id AND type = 'storage' AND is_under_construction = FALSE) as storage_count,
          (SELECT COUNT(*) FROM buildings WHERE plot_id = p.id AND type = 'housing' AND is_under_construction = FALSE) as housing_count
        FROM plots p
        WHERE TIMESTAMPDIFF(MINUTE, last_resource_update, NOW()) >= 2
      `);
      
      for (const plot of plots) {
        const timeDiff = Math.floor((now - new Date(plot.last_resource_update)) / 120000); // 2-minute intervals
        
        // IMPROVED BASE GENERATION RATES (per 2 minutes) - FOOD SIGNIFICANTLY BOOSTED
        let manpowerGain = Math.floor(8 * gameSettings.resourceGenerationRate);
        let materialsGain = Math.floor(8 * gameSettings.resourceGenerationRate);
        let fuelGain = Math.floor(4 * gameSettings.resourceGenerationRate);
        let foodGain = Math.floor(12 * gameSettings.resourceGenerationRate); // DOUBLED food generation
        
        // Specialization bonus (4x for specialized resource)
        if (plot.resource_specialization === 'manpower') manpowerGain *= 4;
        if (plot.resource_specialization === 'materials') materialsGain *= 4;
        if (plot.resource_specialization === 'fuel') fuelGain *= 4;
        if (plot.resource_specialization === 'food') foodGain *= 4; // Even more food for specialists
        
        // Building bonuses - ENHANCED FOOD PRODUCTION
        materialsGain += plot.industry_count * 8;
        foodGain += plot.farm_count * 15; // INCREASED farm bonus
        
        // Storage caps
        const baseCap = 1500; // INCREASED base storage
        const storageCap = baseCap + (plot.storage_count * 750); // INCREASED storage bonus
        
        // Apply gains
        const newManpower = Math.min(storageCap, plot.manpower + (manpowerGain * timeDiff));
        const newMaterials = Math.min(storageCap, plot.materials + (materialsGain * timeDiff));
        const newFuel = Math.min(storageCap, plot.fuel + (fuelGain * timeDiff));
        const newFood = Math.min(storageCap, plot.food + (foodGain * timeDiff));
        
        await pool.execute(`
          UPDATE plots SET 
            manpower = ?, materials = ?, fuel = ?, food = ?,
            last_resource_update = NOW()
          WHERE id = ?
        `, [newManpower, newMaterials, newFuel, newFood, plot.id]);
      }
      
      // Update population growth (every 3 minutes)
      const [populationPlots] = await pool.execute(`
        SELECT p.*, 
          (SELECT COUNT(*) FROM buildings WHERE plot_id = p.id AND type = 'housing' AND is_under_construction = FALSE) as housing_count
        FROM plots p
        WHERE TIMESTAMPDIFF(MINUTE, last_population_update, NOW()) >= 3
        AND population_current < population_cap
      `);
      
      for (const plot of populationPlots) {
        // Recalculate population properly
        await recalculatePopulation(plot.id);
        
        await pool.execute(`
          UPDATE plots SET 
            last_population_update = NOW()
          WHERE id = ?
        `, [plot.id]);
      }
      
      // Handle troop upkeep and morale
      const [troops] = await pool.execute(`
        SELECT t.*, p.food, p.fuel FROM troops t
        JOIN plots p ON t.plot_id = p.id
        WHERE t.count > 0 AND t.is_training = FALSE
      `);
      
      for (const troop of troops) {
        let moraleChange = 0;
        let foodCost = troop.upkeep_food;
        let fuelCost = troop.upkeep_fuel;
        
        // Check if upkeep can be paid
        if (troop.food < foodCost || troop.fuel < fuelCost) {
          moraleChange = -Math.floor(5 * gameSettings.moraleDropRate); // Morale drops if unsupplied
        } else {
          // Deduct upkeep
          await pool.execute(`
            UPDATE plots SET food = food - ?, fuel = fuel - ?
            WHERE id = ?
          `, [foodCost, fuelCost, troop.plot_id]);
          
          // Morale recovery when well-supplied
          moraleChange = Math.floor(2 * gameSettings.moraleRecoveryRate);
        }
        
        // Update morale
        const newMorale = Math.max(0, Math.min(100, troop.morale + moraleChange));
        await pool.execute(`
          UPDATE troops SET morale = ? WHERE id = ?
        `, [newMorale, troop.id]);
        
        // Handle desertion if morale is too low
        if (newMorale <= 10 && Math.random() < 0.1) {
          const desertionCount = Math.ceil(troop.count * 0.1);
          await pool.execute(`
            UPDATE troops SET count = count - ? WHERE id = ?
          `, [desertionCount, troop.id]);
          
          // Recalculate population after desertion
          await recalculatePopulation(troop.plot_id);
        }
      }
      
      // Expire old trades
      await pool.execute(`
        UPDATE trades SET status = 'expired' 
        WHERE status = 'pending' AND expires_at <= NOW()
      `);
      
    } catch (error) {
      console.error('Timer system error:', error);
    }
  }, 10000); // Run every 10 seconds for more responsive updates

  // Helper function to recalculate population
  async function recalculatePopulation(plotId) {
    try {
      // Get all troops for this plot (excluding those being trained or deployed)
      const [troops] = await pool.execute(
        'SELECT SUM(count) as total_troops FROM troops WHERE plot_id = ? AND is_training = FALSE AND is_deployed = FALSE',
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

  return timerInterval;
}