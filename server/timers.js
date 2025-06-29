export function setupTimers(pool, gameSettings, broadcastToAll) {
  // Resource generation and timer system (every 3 minutes)
  const timerInterval = setInterval(async () => {
    try {
      const now = new Date();
      
      // Update resource generation (every 3 minutes)
      const [plots] = await pool.execute(`
        SELECT p.*, 
          (SELECT COUNT(*) FROM buildings WHERE plot_id = p.id AND type = 'industry' AND is_under_construction = FALSE) as industry_count,
          (SELECT COUNT(*) FROM buildings WHERE plot_id = p.id AND type = 'farm' AND is_under_construction = FALSE) as farm_count,
          (SELECT COUNT(*) FROM buildings WHERE plot_id = p.id AND type = 'storage' AND is_under_construction = FALSE) as storage_count,
          (SELECT COUNT(*) FROM buildings WHERE plot_id = p.id AND type = 'housing' AND is_under_construction = FALSE) as housing_count
        FROM plots p
        WHERE TIMESTAMPDIFF(MINUTE, last_resource_update, NOW()) >= 3
      `);
      
      for (const plot of plots) {
        const timeDiff = Math.floor((now - new Date(plot.last_resource_update)) / 180000); // 3-minute intervals
        
        // Base generation rates (per 3 minutes)
        let manpowerGain = Math.floor(6 * gameSettings.resourceGenerationRate);
        let materialsGain = Math.floor(6 * gameSettings.resourceGenerationRate);
        let fuelGain = Math.floor(3 * gameSettings.resourceGenerationRate);
        let foodGain = Math.floor(3 * gameSettings.resourceGenerationRate);
        
        // Specialization bonus (3x for specialized resource)
        if (plot.resource_specialization === 'manpower') manpowerGain *= 3;
        if (plot.resource_specialization === 'materials') materialsGain *= 3;
        if (plot.resource_specialization === 'fuel') fuelGain *= 3;
        if (plot.resource_specialization === 'food') foodGain *= 3;
        
        // Building bonuses
        materialsGain += plot.industry_count * 6;
        foodGain += plot.farm_count * 9;
        
        // Storage caps
        const baseCap = 1000;
        const storageCap = baseCap + (plot.storage_count * 500);
        
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
        const populationGrowth = Math.floor(2 * gameSettings.populationGrowthRate);
        const newPopulationCap = 50 + (plot.housing_count * 25);
        const newPopulation = Math.min(newPopulationCap, plot.population_current + populationGrowth);
        
        await pool.execute(`
          UPDATE plots SET 
            population_current = ?,
            population_cap = ?,
            last_population_update = NOW()
          WHERE id = ?
        `, [newPopulation, newPopulationCap, plot.id]);
      }
      
      // Complete construction (with 10-second buffer to prevent stuck timers)
      const [completedBuildings] = await pool.execute(`
        SELECT * FROM buildings
        WHERE is_under_construction = TRUE AND construction_end <= DATE_SUB(NOW(), INTERVAL 10 SECOND)
      `);
      
      if (completedBuildings.length > 0) {
        await pool.execute(`
          UPDATE buildings SET 
            is_under_construction = FALSE,
            construction_end = NULL
          WHERE is_under_construction = TRUE AND construction_end <= DATE_SUB(NOW(), INTERVAL 10 SECOND)
        `);
        
        // Remove completed buildings from queue
        await pool.execute(`
          DELETE cq FROM construction_queue cq
          JOIN buildings b ON cq.building_id = b.id
          WHERE b.is_under_construction = FALSE
        `);
        
        // Broadcast timer update
        broadcastToAll({ type: 'timer_update', data: { construction_completed: completedBuildings.length } });
      }
      
      // Complete troop training (with 10-second buffer)
      const [completedTroops] = await pool.execute(`
        SELECT * FROM troops
        WHERE is_training = TRUE AND training_end <= DATE_SUB(NOW(), INTERVAL 10 SECOND)
      `);
      
      if (completedTroops.length > 0) {
        await pool.execute(`
          UPDATE troops SET 
            is_training = FALSE,
            training_end = NULL
          WHERE is_training = TRUE AND training_end <= DATE_SUB(NOW(), INTERVAL 10 SECOND)
        `);
        
        // Broadcast timer update
        broadcastToAll({ type: 'timer_update', data: { training_completed: completedTroops.length } });
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
          
          await pool.execute(`
            UPDATE plots SET population_current = population_current - ? WHERE id = ?
          `, [desertionCount, troop.plot_id]);
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
  }, 180000); // Run every 3 minutes (180,000 ms)

  return timerInterval;
}