// Visual Analytics Charts using Chart.js
const LabCharts = {
  categoryChart: null,
  utilizationChart: null,
  healthChart: null,
  maintenanceCostChart: null,
  burnRateChart: null,

  init(analyticsData, consumablesData, assetsData) {
    this.renderCategoryChart(analyticsData.categoryStats);
    this.renderHealthDistributionChart(analyticsData.healthDistribution);
    this.renderUtilizationChart(assetsData);
    this.renderMaintenanceCostChart();
    this.renderBurnRateChart(consumablesData);
  },

  renderCategoryChart(categoryStats) {
    const ctx = document.getElementById('chart-categories');
    if (!ctx) return;
    if (this.categoryChart) this.categoryChart.destroy();

    const labels = Object.keys(categoryStats || {});
    const data = Object.values(categoryStats || {});

    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Analytical', 'Cold-Chain', 'Genomics', 'Bio-Safety'],
        datasets: [{
          data: data.length ? data : [4, 2, 2, 2],
          backgroundColor: [
            '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
        },
        cutout: '65%'
      }
    });
  },

  renderHealthDistributionChart(healthDist) {
    const ctx = document.getElementById('chart-health');
    if (!ctx) return;
    if (this.healthChart) this.healthChart.destroy();

    const optimal = healthDist ? healthDist.optimal : 8;
    const warning = healthDist ? healthDist.warning : 3;
    const critical = healthDist ? healthDist.critical : 1;

    this.healthChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Optimal Health (≥75%)', 'Warning / Needs Service', 'Critical Telemetry Risk'],
        datasets: [{
          data: [optimal, warning, critical],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
  },

  renderUtilizationChart(assets) {
    const ctx = document.getElementById('chart-utilization');
    if (!ctx) return;
    if (this.utilizationChart) this.utilizationChart.destroy();

    // Group assets by approximate department/category
    const depts = {
      'Genomics & Mol. Bio': [88, 920],
      'Biochemistry Lab': [74, 1420],
      'Analytical Chemistry': [91, 2100],
      'Microbiology': [65, 1100],
      'Cell Culture Facility': [82, 1850]
    };

    const labels = Object.keys(depts);
    const utilizationRate = labels.map(k => depts[k][0]);

    this.utilizationChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Asset Utilization Rate (%)',
          data: utilizationRate,
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  },

  renderMaintenanceCostChart() {
    const ctx = document.getElementById('chart-costs');
    if (!ctx) return;
    if (this.maintenanceCostChart) this.maintenanceCostChart.destroy();

    const months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026 (Est)'];
    const costs = [450, 1030, 890, 310, 1400, 1160];
    const downtimeHours = [6, 14, 10, 4, 18, 12];

    this.maintenanceCostChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            type: 'bar',
            label: 'Maintenance Spend ($)',
            data: costs,
            backgroundColor: 'rgba(99, 102, 241, 0.75)',
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Downtime (Hours)',
            data: downtimeHours,
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            ticks: { callback: v => '$' + v }
          },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            ticks: { callback: v => v + ' hrs' }
          }
        },
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  },

  renderBurnRateChart(consumables) {
    const ctx = document.getElementById('chart-burn-rate');
    if (!ctx) return;
    if (this.burnRateChart) this.burnRateChart.destroy();

    const topItems = (consumables || []).slice(0, 6);
    const labels = topItems.map(c => c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name);
    const current = topItems.map(c => c.currentStock);
    const threshold = topItems.map(c => c.minThreshold);

    this.burnRateChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Stock',
            data: current,
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'Reorder Threshold',
            data: threshold,
            backgroundColor: '#f87171',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  }
};
