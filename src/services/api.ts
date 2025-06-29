const API_BASE = 'http://localhost:3001/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('frontline_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('frontline_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('frontline_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  // Auth methods
  async register(email: string, password: string, username: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });

    if (data.success) {
      this.setToken(data.token);
    }

    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.success) {
      this.setToken(data.token);
    }

    return data;
  }

  // Player methods
  async selectNation(nationId: string) {
    return this.request('/player/select-nation', {
      method: 'POST',
      body: JSON.stringify({ nationId }),
    });
  }

  async getPlot() {
    return this.request('/player/plot');
  }

  // NEW: Collect resources
  async collectResources() {
    return this.request('/player/collect-resources', {
      method: 'POST',
    });
  }

  // Game data methods
  async getTerritories() {
    return this.request('/game/territories');
  }

  async getNations() {
    return this.request('/game/nations');
  }

  async getPlayerActions() {
    return this.request('/player/actions');
  }

  async getBattleStats() {
    return this.request('/game/battle-stats');
  }

  // Building methods
  async constructBuilding(buildingType: string) {
    return this.request('/buildings/construct', {
      method: 'POST',
      body: JSON.stringify({ buildingType }),
    });
  }

  async upgradeBuilding(buildingId: string) {
    return this.request('/buildings/upgrade', {
      method: 'POST',
      body: JSON.stringify({ buildingId }),
    });
  }

  async cancelConstruction(buildingId: string) {
    return this.request('/buildings/cancel', {
      method: 'POST',
      body: JSON.stringify({ buildingId }),
    });
  }

  // Troop methods
  async trainTroops(troopType: string, count: number) {
    return this.request('/troops/train', {
      method: 'POST',
      body: JSON.stringify({ troopType, count }),
    });
  }

  async deployTroops(troops: { troopId: string; count: number }[], targetHex: string, type: 'attack' | 'reinforce') {
    return this.request('/troops/deploy', {
      method: 'POST',
      body: JSON.stringify({ troops, targetHex, type }),
    });
  }

  // Supply methods
  async sendSupplyConvoy(toPlotId: string, resourceType: string, amount: number) {
    return this.request('/supply/send', {
      method: 'POST',
      body: JSON.stringify({ toPlotId, resourceType, amount }),
    });
  }

  async requestSupply(resourceType: string, amount: number) {
    return this.request('/supply/request', {
      method: 'POST',
      body: JSON.stringify({ resourceType, amount }),
    });
  }

  // Trade methods
  async getTrades() {
    return this.request('/trades');
  }

  async getPlayers() {
    return this.request('/trades/players');
  }

  async createTrade(toPlayerId: number, offeredResource: string, offeredAmount: number, requestedResource: string, requestedAmount: number) {
    return this.request('/trades/create', {
      method: 'POST',
      body: JSON.stringify({ toPlayerId, offeredResource, offeredAmount, requestedResource, requestedAmount }),
    });
  }

  async acceptTrade(tradeId: string) {
    return this.request('/trades/accept', {
      method: 'POST',
      body: JSON.stringify({ tradeId }),
    });
  }

  async rejectTrade(tradeId: string) {
    return this.request('/trades/reject', {
      method: 'POST',
      body: JSON.stringify({ tradeId }),
    });
  }

  // Admin methods
  async getAdminSettings() {
    return this.request('/admin/settings');
  }

  async updateAdminSettings(settings: any) {
    return this.request('/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  }

  async performSoftWipe() {
    return this.request('/admin/soft-wipe', {
      method: 'POST',
    });
  }

  async performHardWipe() {
    return this.request('/admin/hard-wipe', {
      method: 'POST',
    });
  }

  async resetMap() {
    return this.request('/admin/reset-map', {
      method: 'POST',
    });
  }

  async updateTerritory(hexId: string, updates: any) {
    return this.request(`/admin/territory/${hexId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async createTerritory(territory: any) {
    return this.request('/admin/territory', {
      method: 'POST',
      body: JSON.stringify(territory),
    });
  }

  async deleteTerritory(hexId: string) {
    return this.request(`/admin/territory/${hexId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();