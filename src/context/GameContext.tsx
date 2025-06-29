import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { GameState, User, Plot, Nation, Territory, Building, Troop, HexTile, Battle, SupplyConvoy, Trade } from '../types/game';
import { apiService } from '../services/api';

type GameAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_PLOT'; payload: Plot | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'SET_NATIONS'; payload: Nation[] }
  | { type: 'SET_HEXMAP'; payload: HexTile[] }
  | { type: 'UPDATE_BUILDING'; payload: { buildingId: string; updates: Partial<Building> } }
  | { type: 'ADD_BUILDING'; payload: Building }
  | { type: 'REMOVE_BUILDING'; payload: string }
  | { type: 'UPDATE_TROOP'; payload: { troopId: string; updates: Partial<Troop> } }
  | { type: 'ADD_TROOP'; payload: Troop }
  | { type: 'UPDATE_RESOURCES'; payload: { manpower?: number; materials?: number; fuel?: number; food?: number } }
  | { type: 'UPDATE_POPULATION'; payload: { current?: number; cap?: number } }
  | { type: 'UPDATE_HEX'; payload: { hexId: string; updates: Partial<HexTile> } }
  | { type: 'ADD_BATTLE'; payload: Battle }
  | { type: 'UPDATE_BATTLE'; payload: { battleId: string; updates: Partial<Battle> } }
  | { type: 'ADD_CONVOY'; payload: SupplyConvoy }
  | { type: 'UPDATE_CONVOY'; payload: { convoyId: string; updates: Partial<SupplyConvoy> } }
  | { type: 'ADD_TRADE'; payload: Trade }
  | { type: 'UPDATE_TRADE'; payload: { tradeId: string; updates: Partial<Trade> } }
  | { type: 'SYNC_TIMERS'; payload: number }
  | { type: 'SOFT_RESET'; payload: null };

// Generate initial hex map from server data or fallback to mock
function generateInitialHexMap(): HexTile[] {
  // This will be replaced by server data when available
  const mockHexes = [];
  
  // Create a basic grid for fallback
  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) {
      if (Math.abs(q + r) <= 5) {
        const nations = ['union', 'dominion', 'syndicate', 'neutral'];
        const nation = nations[Math.abs(q + r) % 4];
        
        mockHexes.push({
          id: `hex_${q}_${r}`,
          q,
          r,
          nation,
          isContested: false,
          units: Math.floor(Math.random() * 4),
          underAttack: false,
          name: `Sector ${String.fromCharCode(65 + (Math.abs(q + r) % 26))}${Math.abs(q) + Math.abs(r)}`,
          type: 'land' as const
        });
      }
    }
  }
  
  return mockHexes;
}

const initialNations: Nation[] = [
  {
    id: 'union',
    name: 'Northern Union',
    color: 'blue',
    description: 'A democratic federation controlling the resource-rich northern territories.',
    territories: 0,
    totalPlayers: 0,
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
    territories: 0,
    totalPlayers: 0,
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
    territories: 0,
    totalPlayers: 0,
    leader: 'Executive Director Sarah Chen',
    resources: { pooledMaterials: 12000, pooledFuel: 15000, warPoints: 1980 },
    research: { militaryDoctrine: 2, advancedWeaponry: 4, logistics: 3 },
    government: { president: 'CEO Marcus Webb', general: 'Director of Operations Lisa Park', minister: 'Chief Financial Officer Alex Kim' }
  }
];

const initialTerritories: Territory[] = [
  { id: 'northern-plains', name: 'Northern Plains', nation: 'union', hexes: [], isContested: false },
  { id: 'eastern-archipelago', name: 'Eastern Archipelago', nation: 'dominion', hexes: [], isContested: false },
  { id: 'southern-industrial', name: 'Southern Industrial Zone', nation: 'syndicate', hexes: [], isContested: false },
  { id: 'central-highlands', name: 'Central Highlands', nation: 'neutral', hexes: [], isContested: false }
];

const initialState: GameState = {
  user: null,
  plot: null,
  nations: initialNations,
  territories: initialTerritories,
  hexMap: generateInitialHexMap(),
  battles: [],
  convoys: [],
  trades: [],
  isLoading: false,
  lastSync: Date.now(),
  token: null
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SOFT_RESET':
      apiService.clearToken();
      return {
        ...initialState,
        hexMap: generateInitialHexMap(),
        nations: initialNations,
        battles: [],
        convoys: [],
        trades: [],
        lastSync: Date.now()
      };
      
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_PLOT':
      return { ...state, plot: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_NATIONS':
      return { ...state, nations: action.payload };
    case 'SET_HEXMAP':
      return { ...state, hexMap: action.payload };
    case 'UPDATE_BUILDING':
      if (!state.plot) return state;
      return {
        ...state,
        plot: {
          ...state.plot,
          buildings: (state.plot.buildings || []).map(building =>
            building.id === action.payload.buildingId
              ? { ...building, ...action.payload.updates }
              : building
          )
        }
      };
    case 'ADD_BUILDING':
      if (!state.plot) return state;
      return {
        ...state,
        plot: {
          ...state.plot,
          buildings: [...(state.plot.buildings || []), action.payload],
          buildQueue: [...(state.plot.buildQueue || []), action.payload]
        }
      };
    case 'REMOVE_BUILDING':
      if (!state.plot) return state;
      return {
        ...state,
        plot: {
          ...state.plot,
          buildQueue: (state.plot.buildQueue || []).filter(b => b.id !== action.payload)
        }
      };
    case 'UPDATE_TROOP':
      if (!state.plot) return state;
      return {
        ...state,
        plot: {
          ...state.plot,
          troops: (state.plot.troops || []).map(troop =>
            troop.id === action.payload.troopId
              ? { ...troop, ...action.payload.updates }
              : troop
          )
        }
      };
    case 'ADD_TROOP':
      if (!state.plot) return state;
      return {
        ...state,
        plot: {
          ...state.plot,
          troops: [...(state.plot.troops || []), action.payload]
        }
      };
    case 'UPDATE_RESOURCES':
      if (!state.plot) return state;
      return {
        ...state,
        plot: {
          ...state.plot,
          resources: {
            ...(state.plot.resources || { manpower: 0, materials: 0, fuel: 0, food: 0 }),
            ...action.payload
          },
          lastResourceUpdate: Date.now()
        }
      };
    case 'UPDATE_POPULATION':
      if (!state.plot) return state;
      return {
        ...state,
        plot: {
          ...state.plot,
          population: {
            ...state.plot.population,
            ...action.payload
          }
        }
      };
    case 'UPDATE_HEX':
      return {
        ...state,
        hexMap: state.hexMap.map(hex =>
          hex.id === action.payload.hexId
            ? { ...hex, ...action.payload.updates }
            : hex
        )
      };
    case 'ADD_BATTLE':
      return {
        ...state,
        battles: [...state.battles, action.payload]
      };
    case 'UPDATE_BATTLE':
      return {
        ...state,
        battles: state.battles.map(battle =>
          battle.id === action.payload.battleId
            ? { ...battle, ...action.payload.updates }
            : battle
        )
      };
    case 'ADD_CONVOY':
      return {
        ...state,
        convoys: [...state.convoys, action.payload]
      };
    case 'UPDATE_CONVOY':
      return {
        ...state,
        convoys: state.convoys.map(convoy =>
          convoy.id === action.payload.convoyId
            ? { ...convoy, ...action.payload.updates }
            : convoy
        )
      };
    case 'ADD_TRADE':
      return {
        ...state,
        trades: [...state.trades, action.payload]
      };
    case 'UPDATE_TRADE':
      return {
        ...state,
        trades: state.trades.map(trade =>
          trade.id === action.payload.tradeId
            ? { ...trade, ...action.payload.updates }
            : trade
        )
      };
    case 'SYNC_TIMERS':
      return { ...state, lastSync: action.payload };
    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => void;
  selectNation: (nationId: string) => Promise<boolean>;
  startBuilding: (buildingType: Building['type']) => Promise<boolean>;
  upgradeBuilding: (buildingId: string) => Promise<boolean>;
  cancelConstruction: (buildingId: string) => Promise<boolean>;
  startTraining: (troopType: Troop['type'], count: number) => Promise<boolean>;
  deployTroops: (troops: { troopId: string; count: number }[], targetHex: string, type: 'attack' | 'reinforce') => Promise<boolean>;
  sendSupplyConvoy: (toPlotId: string, resourceType: string, amount: number) => Promise<boolean>;
  requestSupply: (resourceType: string, amount: number) => Promise<boolean>;
  refreshPlotData: () => Promise<void>;
  refreshGameData: () => Promise<void>;
  softReset: () => void;
} | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Load token on mount
  useEffect(() => {
    const token = localStorage.getItem('frontline_token');
    if (token) {
      dispatch({ type: 'SET_TOKEN', payload: token });
      apiService.setToken(token);
      refreshPlotData();
      refreshGameData();
    }
  }, []);

  // Real-time sync with server
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.token) {
        refreshPlotData();
        refreshGameData();
      }
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(interval);
  }, [state.token]);

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const data = await apiService.login(email, password);
      
      if (data.success) {
        dispatch({ type: 'SET_USER', payload: data.user });
        dispatch({ type: 'SET_TOKEN', payload: data.token });
        await refreshPlotData();
        await refreshGameData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const signup = async (email: string, password: string, username: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const data = await apiService.register(email, password, username);
      
      if (data.success) {
        dispatch({ type: 'SET_USER', payload: data.user });
        dispatch({ type: 'SET_TOKEN', payload: data.token });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = () => {
    apiService.clearToken();
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_PLOT', payload: null });
    dispatch({ type: 'SET_TOKEN', payload: null });
  };

  const selectNation = async (nationId: string): Promise<boolean> => {
    try {
      const data = await apiService.selectNation(nationId);
      
      if (data.success) {
        // Update user with new nation
        if (state.user) {
          dispatch({ 
            type: 'SET_USER', 
            payload: { ...state.user, nation: nationId, plotId: data.plotId }
          });
        }
        await refreshPlotData();
        await refreshGameData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Nation selection error:', error);
      return false;
    }
  };

  const refreshPlotData = async () => {
    try {
      const data = await apiService.getPlot();
      dispatch({ type: 'SET_PLOT', payload: data.plot });
    } catch (error) {
      console.error('Plot refresh error:', error);
    }
  };

  const refreshGameData = async () => {
    try {
      // Fetch real game data from server
      const [territoriesData, nationsData] = await Promise.all([
        apiService.getTerritories().catch(() => null),
        apiService.getNations().catch(() => null)
      ]);
      
      if (territoriesData?.territories) {
        // Convert territories to hex map
        const hexMap = territoriesData.territories.map((territory: any) => ({
          id: territory.hex_id,
          q: parseInt(territory.hex_id.split('_')[1]) || 0,
          r: parseInt(territory.hex_id.split('_')[2]) || 0,
          nation: territory.controlled_by_nation,
          owner: territory.controlled_by_player,
          isContested: territory.is_contested,
          units: Math.floor(Math.random() * 4), // This should come from server
          underAttack: territory.under_attack,
          name: `Sector ${territory.hex_id.replace('hex_', '').toUpperCase()}`,
          type: 'land' as const
        }));
        
        dispatch({ type: 'SET_HEXMAP', payload: hexMap });
      }
      
      if (nationsData?.nations) {
        dispatch({ type: 'SET_NATIONS', payload: nationsData.nations });
      }
    } catch (error) {
      console.error('Game data refresh error:', error);
      // Fall back to mock data if server fails
    }
  };

  const startBuilding = async (buildingType: Building['type']): Promise<boolean> => {
    try {
      const data = await apiService.constructBuilding(buildingType);
      
      if (data.success) {
        await refreshPlotData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Construction error:', error);
      return false;
    }
  };

  const upgradeBuilding = async (buildingId: string): Promise<boolean> => {
    try {
      const data = await apiService.upgradeBuilding(buildingId);
      
      if (data.success) {
        await refreshPlotData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Upgrade error:', error);
      return false;
    }
  };

  const cancelConstruction = async (buildingId: string): Promise<boolean> => {
    try {
      const data = await apiService.cancelConstruction(buildingId);
      
      if (data.success) {
        await refreshPlotData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cancel construction error:', error);
      return false;
    }
  };

  const startTraining = async (troopType: Troop['type'], count: number): Promise<boolean> => {
    try {
      const data = await apiService.trainTroops(troopType, count);
      
      if (data.success) {
        await refreshPlotData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Training error:', error);
      return false;
    }
  };

  const deployTroops = async (troops: { troopId: string; count: number }[], targetHex: string, type: 'attack' | 'reinforce'): Promise<boolean> => {
    try {
      const data = await apiService.deployTroops(troops, targetHex, type);
      
      if (data.success) {
        await refreshPlotData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Deployment error:', error);
      return false;
    }
  };

  const sendSupplyConvoy = async (toPlotId: string, resourceType: string, amount: number): Promise<boolean> => {
    try {
      const data = await apiService.sendSupplyConvoy(toPlotId, resourceType, amount);
      
      if (data.success) {
        await refreshPlotData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Supply convoy error:', error);
      return false;
    }
  };

  const requestSupply = async (resourceType: string, amount: number): Promise<boolean> => {
    try {
      const data = await apiService.requestSupply(resourceType, amount);
      
      if (data.success) {
        await refreshPlotData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Supply request error:', error);
      return false;
    }
  };

  const softReset = () => {
    dispatch({ type: 'SOFT_RESET', payload: null });
  };

  return (
    <GameContext.Provider value={{
      state,
      dispatch,
      login,
      signup,
      logout,
      selectNation,
      startBuilding,
      upgradeBuilding,
      cancelConstruction,
      startTraining,
      deployTroops,
      sendSupplyConvoy,
      requestSupply,
      refreshPlotData,
      refreshGameData,
      softReset
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}