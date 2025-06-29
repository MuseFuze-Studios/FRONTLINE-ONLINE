export interface User {
  id: string;
  email: string;
  username: string;
  nation: string;
  plotId: string;
  role: 'player' | 'admin';
  joinedAt: number;
  stats: {
    troopsTrained: number;
    kills: number;
    resourcesEarned: number;
    contributionsToNation: number;
  };
}

export interface Nation {
  id: string;
  name: string;
  color: string;
  description: string;
  territories: number;
  totalPlayers: number;
  leader?: string;
  resources: {
    pooledMaterials: number;
    pooledFuel: number;
    warPoints: number;
  };
  research: {
    militaryDoctrine: number;
    advancedWeaponry: number;
    logistics: number;
  };
  government: {
    president?: string;
    general?: string;
    minister?: string;
  };
}

export interface Building {
  id: string;
  type: 'headquarters' | 'barracks' | 'factory' | 'depot' | 'radar' | 'industry' | 'farm' | 'infrastructure' | 'housing' | 'storage' | 'federal';
  name: string;
  level: number;
  maxLevel: number;
  constructionEnd?: number;
  isUnderConstruction: boolean;
  upgradeEnd?: number;
  isUpgrading: boolean;
  canCancel: boolean;
  description?: string;
  effects?: string[];
  prerequisites?: string[];
}

export interface Troop {
  id: string;
  type: 'infantry' | 'armor' | 'artillery' | 'air';
  name: string;
  count: number;
  trainingEnd?: number;
  isTraining: boolean;
  strength: number;
  morale: number;
  deploymentEnd?: number;
  isDeployed: boolean;
  targetHex?: string;
  upkeepFood: number;
  upkeepFuel: number;
}

export interface Plot {
  id: string;
  userId: string;
  nation: string;
  hexId: string;
  resourceSpecialization: 'manpower' | 'materials' | 'fuel' | 'food';
  population: {
    current: number;
    cap: number;
  };
  buildings: Building[];
  troops: Troop[];
  resources: {
    manpower: number;
    materials: number;
    fuel: number;
    food: number;
  };
  buildQueue: Building[];
  lastResourceUpdate: number;
}

export interface HexTile {
  id: string;
  q: number; // hex coordinate
  r: number; // hex coordinate
  nation: string;
  owner?: string; // user ID if owned by player
  isContested: boolean;
  units: number;
  underAttack: boolean;
  name: string;
  type: 'land' | 'water' | 'mountain' | 'resource';
}

export interface Territory {
  id: string;
  name: string;
  nation: string;
  hexes: string[];
  isContested: boolean;
}

export interface Battle {
  id: string;
  attackerHex: string;
  defenderHex: string;
  attackerTroops: Troop[];
  defenderTroops: Troop[];
  startTime: number;
  endTime: number;
  status: 'ongoing' | 'completed';
  winner?: string;
}

export interface SupplyConvoy {
  id: string;
  fromPlotId: string;
  toPlotId: string;
  resourceType: 'manpower' | 'materials' | 'fuel' | 'food';
  amount: number;
  status: 'preparing' | 'in_transit' | 'delivered' | 'intercepted';
  departureTime?: number;
  arrivalTime?: number;
}

export interface Trade {
  id: string;
  fromPlayerId: number;
  toPlayerId: number;
  offeredResource: 'manpower' | 'materials' | 'fuel' | 'food';
  offeredAmount: number;
  requestedResource: 'manpower' | 'materials' | 'fuel' | 'food';
  requestedAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
}

export interface PlayerAction {
  id: string;
  playerId: number;
  actionType: 'move' | 'attack' | 'occupy';
  fromHex?: string;
  toHex: string;
  troopData?: any;
  startedAt: number;
  completesAt: number;
  status: 'in_progress' | 'completed' | 'cancelled';
}

export interface GameState {
  user: User | null;
  plot: Plot | null;
  nations: Nation[];
  territories: Territory[];
  hexMap: HexTile[];
  battles: Battle[];
  convoys: SupplyConvoy[];
  trades: Trade[];
  isLoading: boolean;
  lastSync: number;
  token?: string;
}