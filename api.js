// API Service Wrapper for Smart Lab Inventory
const API = {
  baseUrl: '',

  async getAssets() {
    const res = await fetch('/api/assets');
    return await res.json();
  },

  async getAsset(id) {
    const res = await fetch(`/api/assets/${encodeURIComponent(id)}`);
    return await res.json();
  },

  async createAsset(assetData) {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetData)
    });
    return await res.json();
  },

  async updateAsset(id, assetData) {
    const res = await fetch(`/api/assets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetData)
    });
    return await res.json();
  },

  async deleteAsset(id) {
    const res = await fetch(`/api/assets/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  async checkoutAsset(id, payload) {
    const res = await fetch(`/api/assets/${encodeURIComponent(id)}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async checkinAsset(id, payload) {
    const res = await fetch(`/api/assets/${encodeURIComponent(id)}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async getConsumables() {
    const res = await fetch('/api/consumables');
    return await res.json();
  },

  async createConsumable(item) {
    const res = await fetch('/api/consumables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    return await res.json();
  },

  async adjustStock(id, payload) {
    const res = await fetch(`/api/consumables/${encodeURIComponent(id)}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async getMaintenance() {
    const res = await fetch('/api/maintenance');
    return await res.json();
  },

  async scheduleMaintenance(task) {
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    return await res.json();
  },

  async completeMaintenance(id, payload) {
    const res = await fetch(`/api/maintenance/${encodeURIComponent(id)}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async getAnalytics() {
    const res = await fetch('/api/analytics');
    return await res.json();
  },

  async getLogs() {
    const res = await fetch('/api/logs');
    return await res.json();
  },

  async getProcurementOrders() {
    const res = await fetch('/api/procurement/orders');
    return await res.json();
  },

  async triggerProcurementOrder(consumableId, requestedQuantity) {
    const res = await fetch('/api/procurement/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consumableId, requestedQuantity })
    });
    return await res.json();
  },

  async sendAIChat(query, role) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, role })
    });
    return await res.json();
  }
};
