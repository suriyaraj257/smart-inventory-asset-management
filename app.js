// Main Smart Lab Inventory Application Controller
const App = {
  currentTab: 'dashboard',
  currentRole: 'Lab Administrator',
  assets: [],
  consumables: [],
  maintenance: [],
  logs: [],
  procurementOrders: [],
  analytics: null,
  selectedAsset: null,

  async init() {
    this.bindEvents();
    await this.refreshAllData();
    AIAgent.init();
    lucide.createIcons();
  },

  bindEvents() {
    // Role change
    document.getElementById('user-role-select')?.addEventListener('change', (e) => {
      this.currentRole = e.target.value;
      this.applyRolePermissions();
      this.showToast(`Switched active view to: ${this.currentRole}`, 'info');
    });

    // Global Search
    document.getElementById('global-search')?.addEventListener('input', (e) => {
      this.handleGlobalSearch(e.target.value);
    });

    // Enter key on AI input
    document.getElementById('ai-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        AIAgent.sendPrompt();
      }
    });
  },

  async refreshAllData() {
    try {
      const [assets, consumables, maintenance, analytics, logs, orders] = await Promise.all([
        API.getAssets(),
        API.getConsumables(),
        API.getMaintenance(),
        API.getAnalytics(),
        API.getLogs(),
        API.getProcurementOrders()
      ]);

      this.assets = assets;
      this.consumables = consumables;
      this.maintenance = maintenance;
      this.analytics = analytics;
      this.logs = logs;
      this.procurementOrders = orders;

      this.renderKPIs();
      this.renderNotificationCenter();
      this.renderCurrentTab();
      this.applyRolePermissions();

      // Render charts if on dashboard or analytics
      if (this.currentTab === 'dashboard' || this.currentTab === 'analytics') {
        LabCharts.init(this.analytics, this.consumables, this.assets);
      }
      lucide.createIcons();
    } catch (err) {
      console.error("Error refreshing data:", err);
      this.showToast('Failed to sync with laboratory server', 'error');
    }
  },

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('bg-indigo-700', 'text-white');
        btn.classList.remove('text-indigo-100', 'hover:bg-indigo-800');
      } else {
        btn.classList.remove('bg-indigo-700', 'text-white');
        btn.classList.add('text-indigo-100', 'hover:bg-indigo-800');
      }
    });

    document.querySelectorAll('.tab-content-panel').forEach(panel => {
      panel.classList.add('hidden');
    });

    const activePanel = document.getElementById(`tab-${tabId}`);
    if (activePanel) {
      activePanel.classList.remove('hidden');
    }

    this.renderCurrentTab();
    lucide.createIcons();
  },

  renderCurrentTab() {
    switch (this.currentTab) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'assets':
        this.renderAssetsTable();
        break;
      case 'consumables':
        this.renderConsumablesTable();
        break;
      case 'maintenance':
        this.renderMaintenanceList();
        break;
      case 'analytics':
        this.renderAnalyticsTab();
        break;
      case 'procurement':
        this.renderProcurementTab();
        break;
    }
  },

  applyRolePermissions() {
    const role = this.currentRole;
    const roleBadge = document.getElementById('current-role-badge');
    if (roleBadge) roleBadge.innerText = role;

    // Admin-only elements
    document.querySelectorAll('.role-admin-only').forEach(el => {
      if (role === 'Lab Administrator') el.classList.remove('hidden');
      else el.classList.add('hidden');
    });

    // Maintenance-only elements
    document.querySelectorAll('.role-maintenance-only').forEach(el => {
      if (role === 'Maintenance Engineer' || role === 'Lab Administrator') el.classList.remove('hidden');
      else el.classList.add('hidden');
    });

    // Researcher / Staff action adjustments
    const roleDesc = document.getElementById('role-description');
    if (roleDesc) {
      if (role === 'Lab Administrator') {
        roleDesc.innerText = 'Full system control: Asset provisioning, procurement approvals & compliance audits.';
      } else if (role === 'Lab Researcher / Staff') {
        roleDesc.innerText = 'Researcher view: Equipment check-out/check-in, experiment hour logging, chemical requests.';
      } else {
        roleDesc.innerText = 'Technician view: Calibration logs, preventative maintenance workflows & telemetry telemetry.';
      }
    }
  },

  renderKPIs() {
    if (!this.analytics) return;
    const s = this.analytics.summary;

    document.getElementById('kpi-total-assets').innerText = s.totalAssets || 0;
    document.getElementById('kpi-operational-rate').innerText = (s.operationalRate || 0) + '%';
    document.getElementById('kpi-maint-due').innerText = s.maintenanceDueCount || 0;
    document.getElementById('kpi-low-stock').innerText = s.lowStockCount || 0;
    document.getElementById('kpi-critical-stock').innerText = s.criticalStockCount || 0;
    document.getElementById('kpi-total-valuation').innerText = '$' + (s.totalValuation || 0).toLocaleString();

    // Urgent banner on top if critical items exist
    const alertBanner = document.getElementById('top-alert-banner');
    if (s.criticalStockCount > 0 || s.overdueMaintenanceCount > 0) {
      alertBanner.classList.remove('hidden');
      document.getElementById('banner-text').innerHTML = `
        <strong>Attention:</strong> <strong>${s.overdueMaintenanceCount} maintenance task(s)</strong> are overdue and <strong>${s.criticalStockCount} critical chemical/reagent(s)</strong> require immediate reordering.
      `;
    } else {
      alertBanner.classList.add('hidden');
    }
  },

  renderNotificationCenter() {
    const overdue = this.maintenance.filter(m => m.status === 'Overdue');
    const lowStock = this.consumables.filter(c => c.status === 'Critical Low' || c.status === 'Low Stock');
    const count = overdue.length + lowStock.length;

    const badge = document.getElementById('notification-badge');
    if (badge) {
      if (count > 0) {
        badge.innerText = count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    const list = document.getElementById('notification-dropdown-list');
    if (list) {
      if (count === 0) {
        list.innerHTML = `<div class="p-4 text-xs text-slate-500 text-center">No pending alerts. All systems nominal.</div>`;
      } else {
        let itemsHtml = '';
        overdue.forEach(m => {
          itemsHtml += `
            <div class="p-3 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer" onclick="App.switchTab('maintenance')">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-semibold text-red-600 flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-red-500"></span> Overdue Maintenance
                </span>
                <span class="text-slate-400 font-mono">${m.scheduledDate}</span>
              </div>
              <p class="text-xs font-medium text-slate-800">${m.assetName}</p>
              <p class="text-[11px] text-slate-500">${m.taskType}</p>
            </div>
          `;
        });
        lowStock.forEach(c => {
          itemsHtml += `
            <div class="p-3 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer" onclick="App.switchTab('consumables')">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-semibold text-amber-600 flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span> ${c.status}
                </span>
                <span class="text-slate-400">${c.currentStock} ${c.unit}</span>
              </div>
              <p class="text-xs font-medium text-slate-800">${c.name}</p>
              <p class="text-[11px] text-slate-500">Location: ${c.location}</p>
            </div>
          `;
        });
        list.innerHTML = itemsHtml;
      }
    }
  },

  toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    dropdown?.classList.toggle('hidden');
  },

  renderDashboard() {
    // Recent logs
    const logContainer = document.getElementById('dashboard-recent-logs');
    if (logContainer) {
      const recent = this.logs.slice(0, 6);
      logContainer.innerHTML = recent.map(l => {
        let icon = 'activity';
        let color = 'text-indigo-600 bg-indigo-50';
        if (l.action.includes('MAINTENANCE')) { icon = 'wrench'; color = 'text-amber-600 bg-amber-50'; }
        else if (l.action.includes('STOCK') || l.action.includes('PROCUREMENT')) { icon = 'package'; color = 'text-emerald-600 bg-emerald-50'; }
        else if (l.action.includes('CHECKOUT')) { icon = 'log-out'; color = 'text-blue-600 bg-blue-50'; }
        else if (l.action.includes('CHECKIN')) { icon = 'log-in'; color = 'text-green-600 bg-green-50'; }

        return `
          <div class="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm text-xs">
            <div class="p-2 rounded-lg ${color} shrink-0">
              <i data-lucide="${icon}" class="w-4 h-4"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span class="font-semibold text-slate-800">${l.action.replace('_', ' ')}</span>
                <span class="text-slate-400 text-[10px]">${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p class="text-slate-600 truncate">${l.details}</p>
              <span class="text-[10px] text-slate-400 mt-1 inline-block">By: ${l.user} (${l.role})</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Predictive alert box
    const predictiveBox = document.getElementById('dashboard-predictive-list');
    if (predictiveBox) {
      const atRisk = this.assets.filter(a => a.aiHealth && a.aiHealth.failureRisk >= 50);
      if (atRisk.length === 0) {
        predictiveBox.innerHTML = `<div class="p-4 text-xs text-slate-500 text-center">All assets operating well within MTBF parameters.</div>`;
      } else {
        predictiveBox.innerHTML = atRisk.map(a => `
          <div class="p-3 rounded-lg border ${a.aiHealth.failureRisk >= 75 ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60'} text-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="font-semibold text-slate-900">${a.name}</span>
              <span class="px-2 py-0.5 rounded text-[11px] font-bold ${a.aiHealth.failureRisk >= 75 ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}">
                ${a.aiHealth.failureRisk}% Failure Risk
              </span>
            </div>
            <p class="text-slate-600 text-[11px] mb-2">${a.aiHealth.recommendation}</p>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500">Hours: ${a.operatingHours}/${a.mtbfHours} hrs | Vib: ${a.vibrationIndex}</span>
              <button onclick="App.openScheduleMaintenanceModal('${a.id}')" class="text-indigo-600 font-semibold hover:underline">
                Schedule Service →
              </button>
            </div>
          </div>
        `).join('');
      }
    }
  },

  // -------------------------------------------------------------
  // ASSETS TAB
  // -------------------------------------------------------------
  renderAssetsTable(filteredList = null) {
    const list = filteredList || this.assets;
    const tbody = document.getElementById('assets-table-body');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-sm text-slate-400">No assets match your search criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(a => {
      let statusBadge = 'bg-emerald-100 text-emerald-800';
      if (a.status === 'Warning') statusBadge = 'bg-amber-100 text-amber-800';
      else if (a.status === 'Maintenance Due') statusBadge = 'bg-orange-100 text-orange-800';
      else if (a.status === 'Repair Required') statusBadge = 'bg-red-100 text-red-800';
      else if (a.status === 'In-Use') statusBadge = 'bg-blue-100 text-blue-800';

      const health = a.aiHealth || { healthScore: 90, failureRisk: 10 };
      let healthColor = 'text-emerald-600';
      if (health.healthScore < 50) healthColor = 'text-red-600 font-bold';
      else if (health.healthScore < 75) healthColor = 'text-amber-600';

      return `
        <tr class="hover:bg-slate-50/80 transition border-b border-slate-100 text-xs">
          <td class="p-3">
            <span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded cursor-pointer hover:bg-indigo-100" onclick="App.openAssetTagModal('${a.id}')">
              ${a.id}
            </span>
          </td>
          <td class="p-3 font-medium text-slate-900">
            <div>${a.name}</div>
            <div class="text-[11px] text-slate-500">${a.manufacturer} • SN: ${a.serialNumber}</div>
          </td>
          <td class="p-3 text-slate-600">${a.category}</td>
          <td class="p-3 text-slate-600">
            <div class="flex items-center gap-1">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${a.location}</span>
            </div>
            <div class="text-[10px] text-slate-400">Assigned: ${a.assignedUser}</div>
          </td>
          <td class="p-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${statusBadge}">
              ${a.status}
            </span>
            <div class="text-[10px] text-slate-500 mt-1">Due: ${a.nextMaintenanceDate}</div>
          </td>
          <td class="p-3">
            <div class="flex items-center gap-1.5">
              <div class="w-12 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div class="h-full ${health.healthScore >= 75 ? 'bg-emerald-500' : health.healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}" style="width: ${health.healthScore}%"></div>
              </div>
              <span class="${healthColor} font-mono text-xs">${health.healthScore}%</span>
            </div>
            <div class="text-[10px] text-slate-400">${a.operatingHours || 0} hrs logged</div>
          </td>
          <td class="p-3 text-right space-x-1">
            <button onclick="App.openAssetTagModal('${a.id}')" title="View QR Tag & Specs" class="p-1.5 rounded hover:bg-slate-200 text-slate-600">
              <i data-lucide="qr-code" class="w-4 h-4"></i>
            </button>
            ${a.status === 'Operational' ? `
              <button onclick="App.openCheckoutModal('${a.id}')" title="Check Out" class="p-1.5 rounded hover:bg-blue-100 text-blue-600">
                <i data-lucide="log-out" class="w-4 h-4"></i>
              </button>
            ` : a.status === 'In-Use' ? `
              <button onclick="App.openCheckinModal('${a.id}')" title="Check In" class="p-1.5 rounded hover:bg-green-100 text-green-600">
                <i data-lucide="log-in" class="w-4 h-4"></i>
              </button>
            ` : ''}
            <button onclick="App.openScheduleMaintenanceModal('${a.id}')" title="Schedule Maintenance" class="p-1.5 rounded hover:bg-amber-100 text-amber-600">
              <i data-lucide="wrench" class="w-4 h-4"></i>
            </button>
            <button onclick="App.deleteAsset('${a.id}')" title="Decommission" class="p-1.5 rounded hover:bg-red-100 text-red-600 role-admin-only">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    lucide.createIcons();
  },

  filterAssets() {
    const category = document.getElementById('filter-asset-category')?.value || 'All';
    const status = document.getElementById('filter-asset-status')?.value || 'All';
    const search = document.getElementById('filter-asset-search')?.value.toLowerCase().trim() || '';

    let filtered = this.assets;
    if (category !== 'All') {
      filtered = filtered.filter(a => a.category === category);
    }
    if (status !== 'All') {
      filtered = filtered.filter(a => a.status === status);
    }
    if (search) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(search) ||
        a.id.toLowerCase().includes(search) ||
        a.serialNumber.toLowerCase().includes(search) ||
        a.location.toLowerCase().includes(search)
      );
    }
    this.renderAssetsTable(filtered);
  },

  // -------------------------------------------------------------
  // CONSUMABLES TAB
  // -------------------------------------------------------------
  renderConsumablesTable(filteredList = null) {
    const list = filteredList || this.consumables;
    const tbody = document.getElementById('consumables-table-body');
    if (!tbody) return;

    tbody.innerHTML = list.map(c => {
      let statusBadge = 'bg-emerald-100 text-emerald-800';
      if (c.status === 'Critical Low') statusBadge = 'bg-red-100 text-red-800 font-bold';
      else if (c.status === 'Low Stock') statusBadge = 'bg-amber-100 text-amber-800';

      return `
        <tr class="hover:bg-slate-50/80 transition border-b border-slate-100 text-xs">
          <td class="p-3">
            <span class="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">${c.catalogNumber}</span>
          </td>
          <td class="p-3 font-medium text-slate-900">
            <div>${c.name}</div>
            <div class="text-[11px] text-slate-500">${c.category} • ${c.supplier}</div>
          </td>
          <td class="p-3">
            <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              <i data-lucide="${c.hazardIcon === 'flame' ? 'flame' : c.hazardIcon === 'corrosive' ? 'alert-triangle' : 'box'}" class="w-3.5 h-3.5 text-amber-600"></i>
              ${c.hazardClass}
            </span>
          </td>
          <td class="p-3 text-slate-600">
            <div>${c.location}</div>
            <div class="text-[10px] text-slate-400">Temp: ${c.storageTemp}</div>
          </td>
          <td class="p-3">
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm text-slate-900">${c.currentStock}</span>
              <span class="text-[11px] text-slate-500">${c.unit}</span>
            </div>
            <div class="text-[10px] text-slate-400">Min: ${c.minThreshold} | Opt: ${c.optimalLevel}</div>
          </td>
          <td class="p-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${statusBadge}">
              ${c.status}
            </span>
          </td>
          <td class="p-3 text-right space-x-1">
            <button onclick="App.openAdjustStockModal('${c.id}', -1)" title="Log Usage (-)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold">
              - Use
            </button>
            <button onclick="App.openAdjustStockModal('${c.id}', 1)" title="Restock (+)" class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-semibold">
              + Add
            </button>
            <button onclick="App.triggerProcurementOrder('${c.id}')" title="Auto Re-Order via ERP" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-semibold">
              🛒 Reorder
            </button>
          </td>
        </tr>
      `;
    }).join('');
    lucide.createIcons();
  },

  // -------------------------------------------------------------
  // MAINTENANCE TAB
  // -------------------------------------------------------------
  renderMaintenanceList() {
    const overdue = this.maintenance.filter(m => m.status === 'Overdue');
    const upcoming = this.maintenance.filter(m => m.status === 'Upcoming' || m.status === 'Scheduled');
    const completed = this.maintenance.filter(m => m.status === 'Completed');

    const overdueContainer = document.getElementById('maintenance-overdue-list');
    const upcomingContainer = document.getElementById('maintenance-upcoming-list');
    const completedContainer = document.getElementById('maintenance-completed-list');

    if (overdueContainer) {
      if (overdue.length === 0) {
        overdueContainer.innerHTML = `<div class="p-4 text-xs text-slate-500 text-center">No overdue tasks. All maintenance current!</div>`;
      } else {
        overdueContainer.innerHTML = overdue.map(m => `
          <div class="p-4 rounded-xl border border-red-200 bg-red-50/70 shadow-sm text-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-red-900 text-sm">${m.assetName}</span>
              <span class="px-2 py-0.5 bg-red-600 text-white rounded text-[11px] font-bold">OVERDUE (${m.scheduledDate})</span>
            </div>
            <p class="font-medium text-slate-800 mb-1">🛠️ ${m.taskType}</p>
            <p class="text-slate-600 text-[11px] mb-2">${m.notes}</p>
            <div class="flex items-center justify-between pt-2 border-t border-red-200/60">
              <span class="text-slate-500">Tech: ${m.assignedTechnician} | Est: $${m.estimatedCost}</span>
              <button onclick="App.openCompleteMaintenanceModal('${m.id}')" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow-sm transition">
                Mark Completed
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    if (upcomingContainer) {
      upcomingContainer.innerHTML = upcoming.map(m => `
        <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-sm text-xs">
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-slate-900">${m.assetName}</span>
            <span class="px-2 py-0.5 ${m.status === 'Upcoming' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'} rounded text-[11px] font-semibold">
              ${m.status}: ${m.scheduledDate}
            </span>
          </div>
          <p class="font-medium text-slate-700 mb-1">🔧 ${m.taskType}</p>
          <p class="text-slate-500 text-[11px] mb-2">${m.notes}</p>
          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <span class="text-slate-400">Assigned: ${m.assignedTechnician}</span>
            <button onclick="App.openCompleteMaintenanceModal('${m.id}')" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition">
              Log Service
            </button>
          </div>
        </div>
      `).join('');
    }

    if (completedContainer) {
      completedContainer.innerHTML = completed.map(m => `
        <div class="p-3 rounded-lg border border-slate-100 bg-slate-50/60 text-xs text-slate-600">
          <div class="flex items-center justify-between mb-1">
            <span class="font-semibold text-slate-800">${m.assetName}</span>
            <span class="text-emerald-600 font-medium">✓ Completed on ${m.completedDate || m.scheduledDate}</span>
          </div>
          <p class="text-[11px] text-slate-500">${m.taskType} • Cost: $${m.actualCost || m.estimatedCost}</p>
          <p class="text-[10px] text-slate-400 mt-1">Notes: ${m.technicianNotes || 'Standard pass.'}</p>
        </div>
      `).join('');
    }
  },

  // -------------------------------------------------------------
  // PROCUREMENT & INTEGRATION TAB
  // -------------------------------------------------------------
  renderProcurementTab() {
    const container = document.getElementById('procurement-orders-list');
    if (!container) return;

    if (this.procurementOrders.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-slate-400">No active procurement requisitions.</div>`;
      return;
    }

    container.innerHTML = this.procurementOrders.map(o => `
      <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">${o.orderId}</span>
            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">${o.status}</span>
          </div>
          <h4 class="font-bold text-slate-900 text-sm">${o.item}</h4>
          <p class="text-slate-500 text-[11px]">Vendor: ${o.vendor} • Lead Time: ${o.deliveryLeadTime} • ERP Ref: <code>${o.erpReference}</code></p>
        </div>
        <div class="text-right">
          <div class="text-base font-bold text-slate-900">$${(o.estimatedCost || 0).toLocaleString()}</div>
          <div class="text-[11px] text-slate-500">${o.quantity} ${o.unit}</div>
          <span class="text-[10px] text-slate-400">Dispatched: ${new Date(o.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  },

  // -------------------------------------------------------------
  // ANALYTICS TAB
  // -------------------------------------------------------------
  renderAnalyticsTab() {
    if (!this.analytics) return;
    LabCharts.init(this.analytics, this.consumables, this.assets);
  },

  // -------------------------------------------------------------
  // MODAL HANDLERS
  // -------------------------------------------------------------
  openAddAssetModal() {
    document.getElementById('modal-add-asset')?.classList.remove('hidden');
  },

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
  },

  async handleAddAssetSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value,
      category: form.category.value,
      model: form.model.value,
      manufacturer: form.manufacturer.value,
      serialNumber: form.serialNumber.value,
      location: form.location.value,
      purchaseCost: parseFloat(form.purchaseCost.value) || 2000,
      warrantyExpiry: form.warrantyExpiry.value,
      maintenanceIntervalDays: parseInt(form.maintenanceIntervalDays.value) || 180,
      description: form.description.value
    };

    try {
      const created = await API.createAsset(payload);
      this.showToast(`Asset registered: ${created.name} (${created.id})`, 'success');
      this.closeModal('modal-add-asset');
      form.reset();
      await this.refreshAllData();
      this.openAssetTagModal(created.id);
    } catch (err) {
      console.error(err);
      this.showToast('Failed to register asset', 'error');
    }
  },

  openAssetTagModal(assetId) {
    const asset = this.assets.find(a => a.id.toLowerCase() === assetId.toLowerCase());
    if (!asset) return;

    this.selectedAsset = asset;
    document.getElementById('tag-asset-id').innerText = asset.id;
    document.getElementById('tag-asset-name').innerText = asset.name;
    document.getElementById('tag-asset-serial').innerText = asset.serialNumber;
    document.getElementById('tag-asset-location').innerText = asset.location;
    document.getElementById('tag-asset-category').innerText = asset.category;
    document.getElementById('tag-asset-warranty').innerText = asset.warrantyExpiry;
    document.getElementById('tag-asset-status').innerText = asset.status;
    document.getElementById('tag-asset-health').innerText = `${asset.aiHealth?.healthScore || 90}%`;

    LabScanner.generateTag(asset, 'tag-qr-container', 'tag-barcode-container');
    document.getElementById('modal-asset-tag')?.classList.remove('hidden');
    lucide.createIcons();
  },

  openScannerModal() {
    document.getElementById('modal-scanner')?.classList.remove('hidden');
    // Setup quick test sample links
    const sampleContainer = document.getElementById('scanner-sample-buttons');
    if (sampleContainer) {
      sampleContainer.innerHTML = this.assets.slice(0, 4).map(a => `
        <button onclick="App.simulateScan('${a.id}')" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded">
          Simulate Scan: ${a.id}
        </button>
      `).join('');
    }

    LabScanner.startCameraScanner((decodedText) => {
      this.handleScanResult(decodedText);
    });
  },

  closeScannerModal() {
    LabScanner.stopCameraScanner();
    document.getElementById('modal-scanner')?.classList.add('hidden');
  },

  simulateScan(assetId) {
    this.closeScannerModal();
    this.openAssetTagModal(assetId);
    this.showToast(`Barcode Scanned: ${assetId}`, 'info');
  },

  handleScanResult(text) {
    this.closeScannerModal();
    try {
      const data = JSON.parse(text);
      if (data.id) {
        this.openAssetTagModal(data.id);
        this.showToast(`Identified Asset via QR: ${data.name} (${data.id})`, 'success');
        return;
      }
    } catch (e) {
      // plain text ID
    }
    const found = this.assets.find(a => a.id.toLowerCase() === text.trim().toLowerCase());
    if (found) {
      this.openAssetTagModal(found.id);
      this.showToast(`Found Asset: ${found.name}`, 'success');
    } else {
      this.showToast(`Scan complete: "${text}"`, 'info');
    }
  },

  // Check out / Check in
  openCheckoutModal(assetId) {
    this.selectedAsset = this.assets.find(a => a.id === assetId);
    document.getElementById('checkout-asset-name').innerText = this.selectedAsset.name;
    document.getElementById('modal-checkout')?.classList.remove('hidden');
  },

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const user = form.user.value;
    const purpose = form.purpose.value;
    const expectedReturn = form.expectedReturn.value;

    await API.checkoutAsset(this.selectedAsset.id, { user, purpose, expectedReturn });
    this.showToast(`Equipment checked out to ${user}`, 'success');
    this.closeModal('modal-checkout');
    await this.refreshAllData();
  },

  openCheckinModal(assetId) {
    this.selectedAsset = this.assets.find(a => a.id === assetId);
    document.getElementById('checkin-asset-name').innerText = this.selectedAsset.name;
    document.getElementById('modal-checkin')?.classList.remove('hidden');
  },

  async handleCheckinSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const loggedHours = form.loggedHours.value;
    const notes = form.notes.value;

    await API.checkinAsset(this.selectedAsset.id, { loggedHours, conditionNotes: notes });
    this.showToast(`Equipment checked in. +${loggedHours} hrs logged.`, 'success');
    this.closeModal('modal-checkin');
    await this.refreshAllData();
  },

  // Stock Adjustment
  openAdjustStockModal(id, defaultDelta = -1) {
    const item = this.consumables.find(c => c.id === id);
    if (!item) return;

    const qty = prompt(`${defaultDelta < 0 ? 'Deduct usage from' : 'Restock'} ${item.name} (${item.unit}):\nCurrent stock: ${item.currentStock} ${item.unit}\nEnter quantity:`, Math.abs(defaultDelta));
    if (!qty || isNaN(qty)) return;

    const delta = defaultDelta < 0 ? -parseFloat(qty) : parseFloat(qty);
    API.adjustStock(id, { delta, reason: 'Manual inventory entry', operator: this.currentRole })
      .then(res => {
        this.showToast(`Stock updated: ${res.item.name} (${res.item.currentStock} ${res.item.unit})`, 'success');
        this.refreshAllData();
      });
  },

  async triggerProcurementOrder(id) {
    const item = this.consumables.find(c => c.id === id);
    if (!item) return;

    const requestedQty = Math.max(10, item.optimalLevel - item.currentStock);
    if (confirm(`Dispatch automated Purchase Requisition to ERP (SAP/Oracle) for:\n\n${item.name}\nQuantity: ${requestedQty} ${item.unit}\nEstimated Cost: $${(requestedQty * item.unitPrice).toFixed(2)}?`)) {
      const res = await API.triggerProcurementOrder(id, requestedQty);
      this.showToast(res.message, 'success');
      await this.refreshAllData();
      this.switchTab('procurement');
    }
  },

  // Maintenance Modals
  openScheduleMaintenanceModal(assetId) {
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return;

    this.selectedAsset = asset;
    document.getElementById('maint-asset-name').innerText = `${asset.name} (${asset.id})`;
    document.getElementById('modal-schedule-maint')?.classList.remove('hidden');
  },

  async handleScheduleMaintenanceSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      assetId: this.selectedAsset.id,
      assetName: this.selectedAsset.name,
      taskType: form.taskType.value,
      frequency: form.frequency.value,
      scheduledDate: form.scheduledDate.value,
      priority: form.priority.value,
      assignedTechnician: form.assignedTechnician.value,
      estimatedCost: parseFloat(form.estimatedCost.value) || 250,
      notes: form.notes.value
    };

    await API.scheduleMaintenance(payload);
    this.showToast('Preventive maintenance task scheduled!', 'success');
    this.closeModal('modal-schedule-maint');
    await this.refreshAllData();
  },

  openCompleteMaintenanceModal(taskId) {
    const task = this.maintenance.find(m => m.id === taskId);
    if (!task) return;

    const actualCost = prompt(`Complete task for "${task.assetName}":\nEnter final service cost ($):`, task.estimatedCost || 200);
    if (actualCost === null) return;

    const technicianNotes = prompt(`Enter technician service notes & certification confirmation:`, 'Replaced worn seals, verified nominal operating telemetry.');

    API.completeMaintenance(taskId, { actualCost, technicianNotes, technician: this.currentRole })
      .then(() => {
        this.showToast(`Maintenance task completed for ${task.assetName}`, 'success');
        this.refreshAllData();
      });
  },

  async deleteAsset(assetId) {
    if (confirm(`Are you sure you want to decommission asset ${assetId}? This will remove it from active inventory tracking.`)) {
      await API.deleteAsset(assetId);
      this.showToast(`Asset ${assetId} decommissioned`, 'info');
      await this.refreshAllData();
    }
  },

  // Global search
  handleGlobalSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      if (this.currentTab === 'assets') this.renderAssetsTable();
      if (this.currentTab === 'consumables') this.renderConsumablesTable();
      return;
    }

    if (this.currentTab === 'assets') {
      const filtered = this.assets.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
      this.renderAssetsTable(filtered);
    } else if (this.currentTab === 'consumables') {
      const filtered = this.consumables.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.catalogNumber.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
      this.renderConsumablesTable(filtered);
    }
  },

  // Export Reports
  exportAuditReport(format = 'csv') {
    if (format === 'csv') {
      let csv = 'Asset ID,Name,Category,Manufacturer,Serial Number,Location,Status,Purchase Date,Purchase Cost,Operating Hours,Health Score\n';
      this.assets.forEach(a => {
        csv += `"${a.id}","${a.name}","${a.category}","${a.manufacturer}","${a.serialNumber}","${a.location}","${a.status}","${a.purchaseDate}",${a.purchaseCost},${a.operatingHours || 0},${a.aiHealth?.healthScore || 100}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `lab_asset_audit_${new Date().toISOString().split('T')[0]}.csv`);
      a.click();
      this.showToast('Exported asset audit report (.csv)', 'success');
    } else if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        generatedAt: new Date().toISOString(),
        institution: "Institutional Laboratory System",
        assets: this.assets,
        consumables: this.consumables,
        maintenance: this.maintenance
      }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `full_inventory_backup_${new Date().toISOString().split('T')[0]}.json`);
      downloadAnchor.click();
      this.showToast('Exported complete database (.json)', 'success');
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    let bgColor = 'bg-slate-900 text-white';
    if (type === 'success') bgColor = 'bg-emerald-600 text-white';
    else if (type === 'error') bgColor = 'bg-red-600 text-white';
    else if (type === 'warning') bgColor = 'bg-amber-600 text-white';

    const toast = document.createElement('div');
    toast.className = `${bgColor} px-4 py-3 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 50);

    setTimeout(() => {
      toast.classList.add('opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

window.App = App;
window.addEventListener('DOMContentLoaded', () => App.init());
