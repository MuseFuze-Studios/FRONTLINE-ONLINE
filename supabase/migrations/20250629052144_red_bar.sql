-- FRONTLINE: Online Database Schema Updates
-- Run these commands in your MySQL console or client

-- Connect to your database first
USE frontline_online;

-- Add new columns to players table
ALTER TABLE players 
ADD COLUMN role ENUM('player', 'admin') DEFAULT 'player' AFTER plot_id,
ADD COLUMN is_ai BOOLEAN DEFAULT FALSE AFTER role;

-- Add new columns to plots table for population tracking
ALTER TABLE plots 
ADD COLUMN last_population_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER last_resource_update;

-- Update buildings table max_level to 50
ALTER TABLE buildings 
MODIFY COLUMN max_level INT DEFAULT 50;

-- Create territories table if it doesn't exist
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
);

-- Create trades table if it doesn't exist
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
);

-- Create player_actions table if it doesn't exist
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
);

-- Optional: Create an admin user (replace with your details)
-- INSERT INTO players (email, username, password_hash, role) 
-- VALUES ('admin@frontline.com', 'Admin', '$2a$10$example_hash_here', 'admin');

-- Verify the changes
SHOW COLUMNS FROM players;
SHOW COLUMNS FROM plots;
SHOW COLUMNS FROM buildings;
SHOW TABLES;