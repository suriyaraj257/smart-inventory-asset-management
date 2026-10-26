const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Paths
const DATA_DIR = __dirname;
const ASSETS_FILE = path.join(DATA_DIR, 'assets.json');
const CONSUMABLES_FILE = path.join(DATA_DIR, 'consumables.json');
const MAINTENANCE_FILE = path.join(DATA_DIR, 'maintenance.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const PROCUREMENT_FILE = path.join(DATA_DIR, 'procurement_orders.json');

// File I/O helpers
function readData(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

function addLog(action, details, user = 'System User', role = 'Lab Staff') {
  const logs = readData(LOGS_FILE);
  const newLog = {
    id: `LOG-${Date.now().toString().slice(-5)}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    action,
    details
  };
  logs.unshift(newLog);
  if (logs.length > 100) logs.pop();
  writeData(LOGS_FILE, logs);
  return newLog;
}

// -------------------------------------------------------------
// AI Predictive Health Calculation Helper
// -------------------------------------------------------------
function calculatePredictiveHealth(asset) {
  const hoursRatio = (asset.operatingHours || 0) / (asset.mtbfHours || 2500);
  const vibration = asset.vibrationIndex !== undefined ? asset.vibrationIndex : 0.2;
  
  // Base risk 0-100
  let failureRisk = Math.round((hoursRatio * 50) + (vibration * 45));
  if (failureRisk > 95) failureRisk = 96;
  if (failureRisk < 5) failureRisk = 5;

  const healthScore = 100 - failureRisk;

  let recommendation = "Asset operating within normal nominal tolerances.";
  let urgency = "Normal";

  if (failureRisk >= 75) {
    urgency = "Critical";
    recommendation = `High probability of component fatigue (${failureRisk}%). Exceeded ${(hoursRatio * 100).toFixed(0)}% of MTBF threshold. Immediate inspection and bearing/seal servicing recommended to prevent unpredicted downtime.`;
  } else if (failureRisk >= 50) {
    urgency = "Warning";
    recommendation = `Elevated vibration index (${vibration}) or approaching maintenance interval. Schedule preventive maintenance within 14 days.`;
  }

  return {
    healthScore,
    failureRisk,
    urgency,
    recommendation,
    mtbfHours: asset.mtbfHours || 2500,
    currentOperatingHours: asset.operatingHours || 0
  };
}

// -------------------------------------------------------------
// ASSETS API
// -------------------------------------------------------------
app.get('/api/assets', (req, res) => {
  const assets = readData(ASSETS_FILE);
  const enriched = assets.map(a => ({
    ...a,
    aiHealth: calculatePredictiveHealth(a)
  }));
  res.json(enriched);
});

app.get('/api/assets/:id', (req, res) => {
  const assets = readData(ASSETS_FILE);
  const asset = assets.find(a => a.id.toLowerCase() === req.params.id.toLowerCase());
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json({
    ...asset,
    aiHealth: calculatePredictiveHealth(asset)
  });
});

app.post('/api/assets', (req, res) => {
  const assets = readData(ASSETS_FILE);
  const newAsset = {
    id: req.body.id || `AST-${1000 + assets.length + 1}`,
    name: req.body.name || 'Unnamed Equipment',
    category: req.body.category || 'General Lab',
    model: req.body.model || 'Standard',
    manufacturer: req.body.manufacturer || 'Lab Essentials',
    serialNumber: req.body.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
    location: req.body.location || 'Main Storage',
    purchaseDate: req.body.purchaseDate || new Date().toISOString().split('T')[0],
    purchaseCost: parseFloat(req.body.purchaseCost) || 5000,
    warrantyExpiry: req.body.warrantyExpiry || '2028-01-01',
    status: req.body.status || 'Operational',
    condition: req.body.condition || 'Excellent',
    assignedUser: req.body.assignedUser || 'Unassigned',
    operatingHours: parseInt(req.body.operatingHours) || 0,
    mtbfHours: parseInt(req.body.mtbfHours) || 3000,
    vibrationIndex: parseFloat(req.body.vibrationIndex) || 0.1,
    lastMaintenanceDate: req.body.lastMaintenanceDate || new Date().toISOString().split('T')[0],
    nextMaintenanceDate: req.body.nextMaintenanceDate || new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
    maintenanceIntervalDays: parseInt(req.body.maintenanceIntervalDays) || 180,
    description: req.body.description || 'Newly registered asset.',
    specifications: req.body.specifications || 'Standard specifications'
  };

  assets.push(newAsset);
  writeData(ASSETS_FILE, assets);
  addLog('ASSET_REGISTERED', `Added ${newAsset.name} (${newAsset.id}) to ${newAsset.location}`, req.body.operator || 'Lab Administrator');

  // Also auto-schedule baseline preventive maintenance
  const maintenance = readData(MAINTENANCE_FILE);
  maintenance.push({
    id: `MNT-${Date.now().toString().slice(-4)}`,
    assetId: newAsset.id,
    assetName: newAsset.name,
    taskType: `Initial Calibration & Baseline Certification`,
    frequency: 'Semi-Annual',
    scheduledDate: newAsset.nextMaintenanceDate,
    status: 'Scheduled',
    priority: 'Medium',
    assignedTechnician: 'Institutional Metrology Team',
    estimatedCost: 150,
    notes: 'Automatically generated baseline inspection task upon asset onboarding.'
  });
  writeData(MAINTENANCE_FILE, maintenance);

  res.status(201).json({
    ...newAsset,
    aiHealth: calculatePredictiveHealth(newAsset)
  });
});

app.put('/api/assets/:id', (req, res) => {
  const assets = readData(ASSETS_FILE);
  const index = assets.findIndex(a => a.id.toLowerCase() === req.params.id.toLowerCase());
  if (index === -1) return res.status(404).json({ error: 'Asset not found' });

  assets[index] = { ...assets[index], ...req.body };
  writeData(ASSETS_FILE, assets);
  addLog('ASSET_UPDATED', `Updated asset details for ${assets[index].name} (${assets[index].id})`, req.body.operator || 'Lab Administrator');

  res.json({
    ...assets[index],
    aiHealth: calculatePredictiveHealth(assets[index])
  });
});

app.delete('/api/assets/:id', (req, res) => {
  let assets = readData(ASSETS_FILE);
  const target = assets.find(a => a.id.toLowerCase() === req.params.id.toLowerCase());
  if (!target) return res.status(404).json({ error: 'Asset not found' });

  assets = assets.filter(a => a.id.toLowerCase() !== req.params.id.toLowerCase());
  writeData(ASSETS_FILE, assets);
  addLog('ASSET_DECOMMISSIONED', `Decommissioned ${target.name} (${target.id})`, 'Lab Administrator');

  res.json({ success: true, message: `Asset ${target.id} removed.` });
});

// Checkout / Checkin
app.post('/api/assets/:id/checkout', (req, res) => {
  const { user, purpose, expectedReturn } = req.body;
  const assets = readData(ASSETS_FILE);
  const asset = assets.find(a => a.id.toLowerCase() === req.params.id.toLowerCase());
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  asset.status = 'In-Use';
  asset.assignedUser = user || 'Lab Staff';
  asset.lastCheckout = {
    user: user || 'Lab Staff',
    date: new Date().toISOString(),
    purpose: purpose || 'Experimental procedure',
    expectedReturn: expectedReturn || 'Tomorrow'
  };

  writeData(ASSETS_FILE, assets);
  addLog('EQUIPMENT_CHECKOUT', `Asset ${asset.name} checked out to ${asset.assignedUser} for "${purpose || 'Research'}"`, asset.assignedUser, 'Lab Staff');

  res.json({ success: true, asset });
});

app.post('/api/assets/:id/checkin', (req, res) => {
  const { loggedHours, conditionNotes } = req.body;
  const assets = readData(ASSETS_FILE);
  const asset = assets.find(a => a.id.toLowerCase() === req.params.id.toLowerCase());
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const prevUser = asset.assignedUser;
  asset.status = 'Operational';
  asset.assignedUser = 'Unassigned';
  if (loggedHours && !isNaN(loggedHours)) {
    asset.operatingHours = (asset.operatingHours || 0) + parseFloat(loggedHours);
  }

  writeData(ASSETS_FILE, assets);
  addLog('EQUIPMENT_CHECKIN', `Asset ${asset.name} returned by ${prevUser}. +${loggedHours || 0} operating hours logged.`, prevUser, 'Lab Staff');

  res.json({ success: true, asset });
});

// -------------------------------------------------------------
// CONSUMABLES & STOCK MONITORING API
// -------------------------------------------------------------
app.get('/api/consumables', (req, res) => {
  const items = readData(CONSUMABLES_FILE);
  // Recalculate status dynamically
  const updated = items.map(item => {
    let status = 'Adequate';
    if (item.currentStock <= item.minThreshold * 0.5) {
      status = 'Critical Low';
    } else if (item.currentStock <= item.minThreshold) {
      status = 'Low Stock';
    }
    return { ...item, status };
  });
  res.json(updated);
});

app.post('/api/consumables', (req, res) => {
  const items = readData(CONSUMABLES_FILE);
  const newItem = {
    id: req.body.id || `CON-${500 + items.length + 1}`,
    name: req.body.name,
    catalogNumber: req.body.catalogNumber || `CAT-${Date.now().toString().slice(-5)}`,
    category: req.body.category || 'General Reagents',
    hazardClass: req.body.hazardClass || 'Non-Hazardous',
    hazardIcon: req.body.hazardIcon || 'box',
    location: req.body.location || 'Central Stockroom',
    currentStock: parseFloat(req.body.currentStock) || 0,
    minThreshold: parseFloat(req.body.minThreshold) || 5,
    optimalLevel: parseFloat(req.body.optimalLevel) || 20,
    unit: req.body.unit || 'Units',
    unitPrice: parseFloat(req.body.unitPrice) || 25,
    supplier: req.body.supplier || 'Lab Supplies Inc.',
    expiryDate: req.body.expiryDate || '2028-12-31',
    lastRestocked: new Date().toISOString().split('T')[0],
    dailyBurnRate: parseFloat(req.body.dailyBurnRate) || 0.2,
    storageTemp: req.body.storageTemp || 'Room Temp',
    status: 'Adequate'
  };

  items.push(newItem);
  writeData(CONSUMABLES_FILE, items);
  addLog('CONSUMABLE_ADDED', `Registered consumable: ${newItem.name} (${newItem.unit}) in ${newItem.location}`, 'Lab Staff');

  res.status(201).json(newItem);
});

app.post('/api/consumables/:id/adjust', (req, res) => {
  const { delta, reason, operator } = req.body;
  const items = readData(CONSUMABLES_FILE);
  const item = items.find(i => i.id.toLowerCase() === req.params.id.toLowerCase());
  if (!item) return res.status(404).json({ error: 'Consumable not found' });

  const oldStock = item.currentStock;
  const change = parseFloat(delta);
  item.currentStock = Math.max(0, parseFloat((oldStock + change).toFixed(2)));

  if (change > 0) {
    item.lastRestocked = new Date().toISOString().split('T')[0];
  }

  // Update status
  if (item.currentStock <= item.minThreshold * 0.5) {
    item.status = 'Critical Low';
  } else if (item.currentStock <= item.minThreshold) {
    item.status = 'Low Stock';
  } else {
    item.status = 'Adequate';
  }

  writeData(CONSUMABLES_FILE, items);

  const actionText = change < 0 ? 'Deducted' : 'Restocked';
  addLog(
    'STOCK_ADJUSTMENT',
    `${actionText} ${Math.abs(change)} ${item.unit} of ${item.name} (${reason || 'Protocol usage'}). New balance: ${item.currentStock} ${item.unit}.`,
    operator || 'Lab Staff'
  );

  res.json({
    success: true,
    item,
    alertNeeded: item.currentStock <= item.minThreshold
  });
});

// -------------------------------------------------------------
// MAINTENANCE API
// -------------------------------------------------------------
app.get('/api/maintenance', (req, res) => {
  const tasks = readData(MAINTENANCE_FILE);
  // Auto-mark overdue based on current date
  const today = new Date().toISOString().split('T')[0];
  const updated = tasks.map(t => {
    if (t.status !== 'Completed') {
      if (t.scheduledDate < today) {
        t.status = 'Overdue';
      } else if (t.scheduledDate <= new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0]) {
        t.status = 'Upcoming';
      } else {
        t.status = 'Scheduled';
      }
    }
    return t;
  });
  res.json(updated);
});

app.post('/api/maintenance', (req, res) => {
  const tasks = readData(MAINTENANCE_FILE);
  const newTask = {
    id: `MNT-${Date.now().toString().slice(-4)}`,
    assetId: req.body.assetId,
    assetName: req.body.assetName || 'Lab Asset',
    taskType: req.body.taskType || 'Standard Calibration',
    frequency: req.body.frequency || 'Quarterly',
    scheduledDate: req.body.scheduledDate || new Date().toISOString().split('T')[0],
    status: 'Scheduled',
    priority: req.body.priority || 'Medium',
    assignedTechnician: req.body.assignedTechnician || 'Carlos Gomez (Technician)',
    estimatedCost: parseFloat(req.body.estimatedCost) || 200,
    notes: req.body.notes || ''
  };

  tasks.push(newTask);
  writeData(MAINTENANCE_FILE, tasks);
  addLog('MAINTENANCE_SCHEDULED', `Scheduled ${newTask.taskType} for ${newTask.assetName} on ${newTask.scheduledDate}`, 'Maintenance Personnel');

  res.status(201).json(newTask);
});

app.put('/api/maintenance/:id/complete', (req, res) => {
  const tasks = readData(MAINTENANCE_FILE);
  const task = tasks.find(t => t.id.toLowerCase() === req.params.id.toLowerCase());
  if (!task) return res.status(404).json({ error: 'Maintenance task not found' });

  task.status = 'Completed';
  task.completedDate = new Date().toISOString().split('T')[0];
  task.actualCost = parseFloat(req.body.actualCost) || task.estimatedCost;
  task.technicianNotes = req.body.technicianNotes || 'Service completed successfully according to manufacturer specs.';

  // Update corresponding asset's lastMaintenanceDate and reset vibration/wear telemetry
  const assets = readData(ASSETS_FILE);
  const asset = assets.find(a => a.id === task.assetId);
  if (asset) {
    asset.lastMaintenanceDate = task.completedDate;
    asset.status = 'Operational';
    asset.condition = 'Good';
    asset.vibrationIndex = Math.max(0.05, (asset.vibrationIndex || 0.3) * 0.4); // reduction after maintenance
    const intervalDays = asset.maintenanceIntervalDays || 180;
    const nextDate = new Date(Date.now() + intervalDays * 24 * 3600 * 1000);
    asset.nextMaintenanceDate = nextDate.toISOString().split('T')[0];
    writeData(ASSETS_FILE, assets);
  }

  writeData(MAINTENANCE_FILE, tasks);
  addLog('MAINTENANCE_COMPLETED', `Completed ${task.taskType} for ${task.assetName}. Cost: $${task.actualCost}`, req.body.technician || 'Carlos Gomez', 'Maintenance Personnel');

  res.json({ success: true, task, updatedAsset: asset });
});

// -------------------------------------------------------------
// INSTITUTIONAL PROCUREMENT INTEGRATION API
// -------------------------------------------------------------
app.get('/api/procurement/orders', (req, res) => {
  const orders = readData(PROCUREMENT_FILE);
  res.json(orders);
});

app.post('/api/procurement/order', (req, res) => {
  const { consumableId, requestedQuantity } = req.body;
  const consumables = readData(CONSUMABLES_FILE);
  const item = consumables.find(c => c.id.toLowerCase() === consumableId.toLowerCase());
  if (!item) return res.status(404).json({ error: 'Consumable item not found' });

  const qty = parseInt(requestedQuantity) || Math.max(10, item.optimalLevel - item.currentStock);
  const cost = parseFloat((qty * (item.unitPrice || 20)).toFixed(2));
  const orders = readData(PROCUREMENT_FILE);

  const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newOrder = {
    orderId: poNumber,
    createdAt: new Date().toISOString(),
    item: item.name,
    itemId: item.id,
    quantity: qty,
    unit: item.unit,
    estimatedCost: cost,
    vendor: item.supplier || 'Approved Institutional Vendor',
    status: 'Transmitted to ERP (SAP Ariba / Oracle Financials)',
    erpReference: `SAP-PR-${Math.floor(10000 + Math.random() * 90000)}`,
    deliveryLeadTime: '3-5 business days'
  };

  orders.unshift(newOrder);
  writeData(PROCUREMENT_FILE, orders);
  addLog('PROCUREMENT_REQUISITION', `Auto-generated purchase order ${poNumber} for ${qty} ${item.unit} of ${item.name} ($${cost})`, 'Procurement Integration Bot', 'System AI');

  res.status(201).json({
    success: true,
    message: `Purchase Requisition ${poNumber} dispatched to Institutional Procurement System.`,
    order: newOrder
  });
});

// -------------------------------------------------------------
// ANALYTICS & USAGE REPORTING API
// -------------------------------------------------------------
app.get('/api/analytics', (req, res) => {
  const assets = readData(ASSETS_FILE);
  const consumables = readData(CONSUMABLES_FILE);
  const maintenance = readData(MAINTENANCE_FILE);

  const totalAssets = assets.length;
  const operationalCount = assets.filter(a => a.status === 'Operational').length;
  const maintenanceDueCount = assets.filter(a => a.status === 'Maintenance Due' || a.status === 'Warning' || a.status === 'Repair Required').length;
  const inUseCount = assets.filter(a => a.status === 'In-Use').length;
  const totalValuation = assets.reduce((sum, a) => sum + (parseFloat(a.purchaseCost) || 0), 0);

  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + (parseFloat(m.actualCost || m.estimatedCost) || 0), 0);
  const overdueMaintenanceCount = maintenance.filter(m => m.status === 'Overdue').length;
  const upcomingMaintenanceCount = maintenance.filter(m => m.status === 'Upcoming').length;

  const lowStockCount = consumables.filter(c => c.currentStock <= c.minThreshold).length;
  const criticalStockCount = consumables.filter(c => c.currentStock <= c.minThreshold * 0.5).length;

  // Department / Category breakdown
  const categoryStats = {};
  assets.forEach(a => {
    categoryStats[a.category] = (categoryStats[a.category] || 0) + 1;
  });

  // Health risk breakdown
  let healthOptimal = 0;
  let healthWarning = 0;
  let healthCritical = 0;

  assets.forEach(a => {
    const health = calculatePredictiveHealth(a);
    if (health.healthScore >= 75) healthOptimal++;
    else if (health.healthScore >= 50) healthWarning++;
    else healthCritical++;
  });

  res.json({
    summary: {
      totalAssets,
      operationalCount,
      maintenanceDueCount,
      inUseCount,
      operationalRate: totalAssets > 0 ? Math.round((operationalCount / totalAssets) * 100) : 0,
      totalValuation,
      totalMaintenanceCost,
      overdueMaintenanceCount,
      upcomingMaintenanceCount,
      lowStockCount,
      criticalStockCount
    },
    categoryStats,
    healthDistribution: {
      optimal: healthOptimal,
      warning: healthWarning,
      critical: healthCritical
    }
  });
});

// Logs API
app.get('/api/logs', (req, res) => {
  const logs = readData(LOGS_FILE);
  res.json(logs);
});

// -------------------------------------------------------------
// AI AGENT INTERFACE (Natural Language Processing & Insights)
// -------------------------------------------------------------
app.post('/api/ai/chat', (req, res) => {
  const { query, role = 'Lab Staff' } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Valid query prompt is required' });
  }

  const q = query.toLowerCase().trim();
  const assets = readData(ASSETS_FILE);
  const consumables = readData(CONSUMABLES_FILE);
  const maintenance = readData(MAINTENANCE_FILE);

  let responseText = "";
  let actionTaken = null;
  let quickSuggestions = [];

  // 1. ADD / REGISTER ASSET via natural language
  // Pattern: "add [name] in [location]..."
  if (q.startsWith('add asset') || q.startsWith('register asset') || (q.startsWith('add ') && (q.includes('lab') || q.includes('room') || q.includes('serial') || q.includes('model')))) {
    // Extract info using heuristics
    let assetName = "New Laboratory Asset";
    let location = "Central Bio Lab - Room 204";
    let cost = 4500;
    let category = "General Lab Infrastructure";

    // Extract name
    const nameMatch = query.match(/(?:add|register)(?:\s+asset)?\s+([A-Za-z0-9\s\-\.\+]+?)(?:\s+in|\s+at|\s+with|\s+serial|\s+model|\s+cost|,|$)/i);
    if (nameMatch && nameMatch[1].trim().length > 2) {
      assetName = nameMatch[1].trim().replace(/^(?:a|an|the|new)\s+/i, '').trim();
    }

    // Extract location
    const locMatch = query.match(/(?:in|at|room|bench)\s+([A-Za-z0-9\s\-]+?)(?:\s+with|\s+serial|\s+model|\s+cost|,|$)/i);
    if (locMatch && locMatch[1].trim().length > 2) {
      location = locMatch[1].trim();
    }

    // Extract cost
    const costMatch = query.match(/\$?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s*(?:dollars|usd|\$)?/i);
    if (costMatch) {
      cost = parseFloat(costMatch[1].replace(/,/g, ''));
    }

    // Extract serial number if specified
    const serialMatch = query.match(/(?:serial|sn)[:\s]+([A-Za-z0-9\-]+)/i);
    const parsedSerial = serialMatch ? serialMatch[1].trim() : `SN-${Date.now().toString().slice(-6)}`;

    // Auto-categorize
    if (/centrifuge|rotary|hplc|spectro|chromat/i.test(assetName)) category = "Analytical & Separation";
    else if (/freezer|fridge|incubator|autoclave|cold/i.test(assetName)) category = "Cold-Chain & Storage";
    else if (/pcr|cycler|sequencer|dna|electrophoresis/i.test(assetName)) category = "Genomics & Molecular";
    else if (/biosafety|hood|cabinet|laminar/i.test(assetName)) category = "Bio-Containment & Safety";
    else if (/microscope|imaging|camera/i.test(assetName)) category = "Imaging & Microscopy";
    else if (/balance|scale|ph meter/i.test(assetName)) category = "Metrology & Measurement";

    const newId = `AST-${1000 + assets.length + 1}`;
    const createdAsset = {
      id: newId,
      name: assetName,
      category,
      model: "Standard Enterprise",
      manufacturer: "Verified Lab Manufacturer",
      serialNumber: parsedSerial,
      location: location,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: cost,
      warrantyExpiry: new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: "Operational",
      condition: "Excellent",
      assignedUser: "Unassigned",
      operatingHours: 0,
      mtbfHours: 3500,
      vibrationIndex: 0.1,
      lastMaintenanceDate: new Date().toISOString().split('T')[0],
      nextMaintenanceDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
      maintenanceIntervalDays: 180,
      description: `Registered via LabPulse AI Assistant: ${query}`,
      specifications: "Standard certified institutional asset"
    };

    assets.push(createdAsset);
    writeData(ASSETS_FILE, assets);
    addLog('ASSET_REGISTERED', `AI Natural Language registered ${createdAsset.name} (${createdAsset.id})`, role);

    // Auto schedule baseline calibration
    maintenance.push({
      id: `MNT-${Date.now().toString().slice(-4)}`,
      assetId: newId,
      assetName: createdAsset.name,
      taskType: `Initial IQ/OQ Validation & Calibration`,
      frequency: "Semi-Annual",
      scheduledDate: createdAsset.nextMaintenanceDate,
      status: "Scheduled",
      priority: "Medium",
      assignedTechnician: "Carlos Gomez (Technician)",
      estimatedCost: 200,
      notes: "Baseline qualification generated by AI Agent."
    });
    writeData(MAINTENANCE_FILE, maintenance);

    actionTaken = { type: 'ASSET_CREATED', asset: createdAsset };
    responseText = `✅ **Asset Successfully Registered!**\n\n- **Asset ID:** \`${createdAsset.id}\`\n- **Name:** **${createdAsset.name}**\n- **Category:** ${createdAsset.category}\n- **Location:** ${createdAsset.location}\n- **Estimated Cost:** $${cost.toLocaleString()}\n- **Warranty Until:** ${createdAsset.warrantyExpiry}\n- **Scheduled First Calibration:** ${createdAsset.nextMaintenanceDate}\n\n*A QR code & barcode have been generated, and initial baseline validation has been queued.*`;
    quickSuggestions = [
      `Print QR code for ${createdAsset.id}`,
      `Check warranty details for ${createdAsset.id}`,
      `Assign ${createdAsset.id} to a researcher`
    ];
  }

  // 2. DEDUCT / ADJUST CONSUMABLE via natural language
  else if (q.includes('used ') || q.includes('deduct ') || q.includes('consumed ') || q.includes('restock ')) {
    const isRestock = q.includes('restock');
    // Find matching consumable
    const match = consumables.find(c => {
      const nameParts = c.name.toLowerCase().split(/[\s,]+/);
      return nameParts.some(p => p.length > 3 && q.includes(p));
    });

    if (match) {
      const amountMatch = q.match(/(\d+(?:\.\d+)?)/);
      const deltaQty = amountMatch ? parseFloat(amountMatch[1]) : 1;
      const actualDelta = isRestock ? deltaQty : -deltaQty;

      match.currentStock = Math.max(0, parseFloat((match.currentStock + actualDelta).toFixed(2)));
      if (match.currentStock <= match.minThreshold * 0.5) match.status = "Critical Low";
      else if (match.currentStock <= match.minThreshold) match.status = "Low Stock";
      else match.status = "Adequate";

      writeData(CONSUMABLES_FILE, consumables);
      addLog('STOCK_ADJUSTMENT', `AI Assistant recorded ${isRestock ? 'restock' : 'usage'} of ${deltaQty} ${match.unit} of ${match.name}`, role);

      actionTaken = { type: 'STOCK_UPDATED', item: match };
      responseText = `📦 **Inventory Updated for ${match.name}:**\n\n- **Action:** ${isRestock ? 'Restocked' : 'Deducted'} ${deltaQty} ${match.unit}\n- **Remaining Balance:** **${match.currentStock} ${match.unit}**\n- **Safety Threshold:** ${match.minThreshold} ${match.unit}\n- **Current Status:** \`${match.status}\`${match.currentStock <= match.minThreshold ? '\n\n⚠️ **Warning:** Stock has dropped below safe operational threshold! Recommended re-order quantity: ' + (match.optimalLevel - match.currentStock) + ' ' + match.unit : ''}`;
      quickSuggestions = [
        `Reorder ${match.name} via ERP`,
        "Show all low stock chemicals",
        "View consumption analytics"
      ];
    } else {
      responseText = `I couldn't identify the exact consumable item from your phrase. Available tracked chemicals and supplies include:\n- **Ethanol 99.5%**\n- **Hydrochloric Acid 37%**\n- **Taq Master Mix**\n- **Pipette Tips 200µL**\n- **Acetonitrile HPLC**\n- **Nitrile Gloves (M)**\n\nPlease specify the item name and quantity (e.g., *"Used 2 bottles of Ethanol"*).`;
    }
  }

  // 3. PREDICTIVE MAINTENANCE & FAILURE RISK DIAGNOSTICS
  else if (q.includes('predict') || q.includes('health') || q.includes('failure') || q.includes('risk') || q.includes('sensor') || q.includes('telemetry')) {
    const evaluated = assets.map(a => ({
      asset: a,
      health: calculatePredictiveHealth(a)
    })).sort((a, b) => b.health.failureRisk - a.health.failureRisk);

    const criticalList = evaluated.filter(e => e.health.failureRisk >= 60);

    responseText = `🔬 **AI Predictive Maintenance & Telemetry Assessment**\n\nEvaluated **${assets.length} institutional assets** across operating hours, vibration telemetry, and MTBF failure profiles.\n\n`;

    if (criticalList.length > 0) {
      responseText += `⚠️ **High-Risk Equipment Requiring Immediate Action:**\n\n`;
      criticalList.forEach(item => {
        responseText += `• **${item.asset.name}** (\`${item.asset.id}\`):\n  - **Health Score:** \`${item.health.healthScore}/100\` (Failure Risk: **${item.health.failureRisk}%**)\n  - **Telemetry:** Operating Hours: ${item.asset.operatingHours}/${item.asset.mtbfHours} hrs | Vibration Index: \`${item.asset.vibrationIndex}\`\n  - **AI Recommendation:** ${item.health.recommendation}\n\n`;
      });
    } else {
      responseText += `✅ All equipment is currently within acceptable MTBF degradation parameters.\n\n`;
    }

    responseText += `💡 **Predictive Insights:**\n1. Replace high-pressure seals on **Waters Arc HPLC** before scheduled batch processing to avoid costly run interruptions.\n2. Clean condenser coils on **TSX Ultra-Low Freezer** to reduce compressor vibration and safeguard sensitive -80°C bio-samples.`;

    quickSuggestions = [
      "Schedule HPLC seal replacement",
      "Dispatch technician for TSX Freezer",
      "Download full equipment health report"
    ];
  }

  // 4. LOW STOCK & REORDER ALERTS
  else if (q.includes('low stock') || q.includes('reorder') || q.includes('shortage') || q.includes('supplies running low') || q.includes('depleted')) {
    const lowStock = consumables.filter(c => c.currentStock <= c.minThreshold);
    if (lowStock.length === 0) {
      responseText = `✅ **Inventory Stock Status:** All consumables and reagents are currently above their safety thresholds.`;
    } else {
      responseText = `⚠️ **Consumables & Reagents Requiring Re-Ordering (${lowStock.length} items):**\n\n`;
      lowStock.forEach(c => {
        const deficit = c.optimalLevel - c.currentStock;
        const estCost = (deficit * (c.unitPrice || 20)).toFixed(2);
        responseText += `• **${c.name}** (\`${c.catalogNumber}\`):\n  - Current Stock: **${c.currentStock} ${c.unit}** (Min Safe Level: ${c.minThreshold})\n  - Status: \`${c.status}\` | Location: ${c.location}\n  - Recommended Reorder: **${deficit} ${c.unit}** (Est. Cost: **$${estCost}** from ${c.supplier})\n\n`;
      });
      responseText += `*You can trigger instant 1-click Purchase Requisitions to the institutional ERP (SAP / Oracle) via the Consumables tab.*`;
    }
    quickSuggestions = [
      "Auto-order all low stock items",
      "Show hazardous chemicals inventory",
      "Check pending procurement orders"
    ];
  }

  // 5. MAINTENANCE SCHEDULE & OVERDUE CHECKS
  else if (q.includes('maintenance') || q.includes('calibration') || q.includes('overdue') || q.includes('service') || q.includes('inspection')) {
    const overdue = maintenance.filter(m => m.status === 'Overdue');
    const upcoming = maintenance.filter(m => m.status === 'Upcoming');

    responseText = `🛠️ **Laboratory Maintenance & Calibration Status:**\n\n`;
    if (overdue.length > 0) {
      responseText += `🚨 **OVERDUE TASKS (${overdue.length}):**\n`;
      overdue.forEach(m => {
        responseText += `• **${m.assetName}** (\`${m.assetId}\`)\n  - Task: **${m.taskType}**\n  - Due Date: \`${m.scheduledDate}\` | Priority: **${m.priority}**\n  - Assigned: ${m.assignedTechnician}\n  - Issue: ${m.notes}\n\n`;
      });
    }

    if (upcoming.length > 0) {
      responseText += `📅 **UPCOMING SCHEDULED SERVICES (Next 14 Days):**\n`;
      upcoming.forEach(m => {
        responseText += `• **${m.assetName}** - ${m.taskType} on \`${m.scheduledDate}\` (${m.assignedTechnician})\n`;
      });
    }

    quickSuggestions = [
      "Complete overdue HPLC task",
      "Schedule technician for Biosafety Cabinet",
      "Export compliance maintenance log"
    ];
  }

  // 6. ASSET PLACEMENT & UTILIZATION RECOMMENDATIONS
  else if (q.includes('placement') || q.includes('utilization') || q.includes('optimization') || q.includes('layout') || q.includes('workflow')) {
    responseText = `🧭 **AI Lab Placement & Utilization Optimization Plan:**\n\n` +
      `1. **Proximity Optimization for Genomics Workflow:**\n` +
      `   - Currently, the *Bio-Rad CFX96 PCR* is in Room 305 while the *Eppendorf 5810R Centrifuge* is in Room 204. Moving an auxiliary refrigerated microcentrifuge directly to Room 305 Bench C2 will eliminate an estimated 14 minutes of transit time per PCR plate setup and reduce sample degradation risk.\n\n` +
      `2. **Vibration Isolation for Microbalance:**\n` +
      `   - *Mettler Toledo XPR205* is currently 4 meters away from the *Innova 44R Incubator Shaker*. Relocating the analytical balance to the granite anti-vibration slab on the East load-bearing wall of Room 212 will reduce draft/vibration noise by 42%.\n\n` +
      `3. **Chemical Segregation & Flammables Storage:**\n` +
      `   - Acetonitrile (Flammable) and Hydrochloric Acid (Corrosive) are correctly segregated into Cabinets Fl-01 and AC-02, satisfying OSHA 1910.1450 compliance.\n\n` +
      `4. **Equipment Downtime Mitigation:**\n` +
      `   - The *Waters HPLC* has reached 4,100 operating hours (107% MTBF). Consider routing secondary analytical batches to the UV-2600i Spectrophotometer during the HPLC service overhaul.`;

    quickSuggestions = [
      "View asset utilization chart",
      "Check equipment operating hours",
      "Print lab placement guidelines"
    ];
  }

  // 7. SPECIFIC ASSET INQUIRY OR WARRANTY
  else if (q.includes('warranty') || q.includes('where is') || q.includes('status of') || q.includes('cost of') || q.includes('serial') || q.includes('ast-')) {
    // Find matching asset
    const match = assets.find(a => {
      const qLower = q.toLowerCase();
      if (qLower.includes(a.id.toLowerCase())) return true;
      const words = a.name.toLowerCase().split(/[\s,]+/);
      return words.filter(w => w.length > 3).some(w => qLower.includes(w));
    });

    if (match) {
      const health = calculatePredictiveHealth(match);
      responseText = `📋 **Asset Profile: ${match.name}**\n\n` +
        `- **Asset ID:** \`${match.id}\`\n` +
        `- **Serial Number:** \`${match.serialNumber}\`\n` +
        `- **Manufacturer / Model:** ${match.manufacturer} - ${match.model}\n` +
        `- **Physical Location:** 📍 **${match.location}**\n` +
        `- **Status:** \`${match.status}\` (Condition: **${match.condition}**)\n` +
        `- **Assigned Custodian:** ${match.assignedUser}\n` +
        `- **Purchase Date:** ${match.purchaseDate} (Acquisition: $${(match.purchaseCost || 0).toLocaleString()})\n` +
        `- **Warranty Expiration:** 🛡️ **${match.warrantyExpiry}** (${new Date(match.warrantyExpiry) > new Date() ? 'Active Warranty' : 'Expired'})\n` +
        `- **Operating Hours:** ${match.operatingHours} hrs (MTBF: ${match.mtbfHours} hrs)\n` +
        `- **AI Health Score:** **${health.healthScore}/100** (Risk: ${health.failureRisk}%)\n` +
        `- **Next Scheduled Service:** ${match.nextMaintenanceDate}\n\n` +
        `**Specifications:** ${match.specifications}`;

      quickSuggestions = [
        `Print QR tag for ${match.id}`,
        `Schedule maintenance for ${match.id}`,
        match.status === 'Operational' ? `Check out ${match.id}` : `Check in ${match.id}`
      ];
    } else {
      responseText = `I couldn't pinpoint the exact asset from your query. You can ask by Asset ID (e.g. \`AST-1001\`, \`AST-1003\`) or equipment name (e.g. *"Centrifuge"*, *"Freezer"*, *"HPLC"*, *"Autoclave"*, *"Microscope"*).`;
    }
  }

  // 8. DEFAULT INTELLIGENT LAB ADVISOR RESPONSE
  else {
    const totalAssets = assets.length;
    const lowCount = consumables.filter(c => c.currentStock <= c.minThreshold).length;
    const overdueCount = maintenance.filter(m => m.status === 'Overdue').length;

    responseText = `👋 **Hello! I am your AI Lab Asset & Inventory Assistant.**\n\nI am actively monitoring the laboratory facility. Here is the real-time operational pulse:\n\n` +
      `• **Total Equipment Tracked:** ${totalAssets} assets across 6 specialized lab facilities\n` +
      `• **Maintenance Alerts:** ⚠️ **${overdueCount} overdue** and **${maintenance.filter(m => m.status === 'Upcoming').length} upcoming** scheduled services\n` +
      `• **Consumable Reagents:** 📦 **${lowCount} items** below safety stock thresholds\n` +
      `• **High-Risk Equipment:** Waters HPLC & TSX -80°C Freezer flagged for telemetry anomalies\n\n` +
      `**How I can assist you right now:**\n` +
      `1. **Add/Update Assets:** *"Add a Fisher Scientific Incubator in Room 104 with cost $3,800"*\n` +
      `2. **Deduct/Restock Reagents:** *"Used 2 bottles of Ethanol in Room 210"*\n` +
      `3. **Predictive Health:** *"Run predictive maintenance diagnostics"*\n` +
      `4. **Maintenance Schedules:** *"Which equipment is overdue for calibration?"*\n` +
      `5. **Asset Placement & Utilization:** *"Suggest layout improvements for genomics lab"*`;

    quickSuggestions = [
      "Run predictive maintenance diagnostics",
      "Which equipment is overdue for calibration?",
      "Show all low stock chemicals",
      "Suggest asset layout improvements"
    ];
  }

  res.json({
    reply: responseText,
    actionTaken,
    quickSuggestions,
    timestamp: new Date().toISOString()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(` Smart Lab Inventory & Asset Management System running!`);
  console.log(` Server URL: http://localhost:${PORT}`);
  console.log(` Data Directory: ${DATA_DIR}`);
  console.log(`======================================================`);
});
