# 🔬 LabPulse: Smart Inventory & Asset Management System
### Tailored for Academic Laboratories & Educational Institutions

LabPulse is an intelligent, full-stack laboratory asset and inventory operating system designed to automate tracking, preventive maintenance, chemical/reagent stock level monitoring, and predictive lifecycle analytics.

---

## 🌟 Key Features

### 1. 📋 Comprehensive Inventory Tracking
- **Detailed Asset Profiles:** Tracks Equipment ID, Name, Category, Manufacturer, Model, Serial Number, Physical Lab Location (Room, Bench, Cabinet), Acquisition Cost, Purchase Date, Warranty Expiration Date, Operational Status, and Assigned Custodian.
- **Dynamic Barcode & 2D QR Code Generation:** Real-time generation of printable Code128 barcodes and ISO-standard QR codes with asset payloads.
- **Integrated Scanner Support:** Camera-based scanning via `Html5Qrcode` as well as simulated one-click scan testing for fast bench testing.
- **Check-Out / Check-In Workflows:** Track custodial custody, purpose of experiment, expected return dates, and cumulative logged operating hours.

### 2. 🛠️ Preventive Maintenance & Automated Scheduling
- **Intelligent Schedule Generation:** Generates service tasks based on equipment type, runtime frequency, and manufacturer maintenance intervals (e.g. 90-day autoclave safety pop tests, 180-day centrifuge rotor balancing, 365-day biosafety cabinet HEPA certification).
- **Service Status Categorization:** Real-time categorization into **Overdue**, **Upcoming (Next 30 Days)**, and **Historical Completed Logs**.
- **Certification Logs:** Records technician notes, ISO calibration standards, actual repair costs, and automatically updates asset health telemetry.

### 3. 🧪 Stock Level & Chemical Consumable Monitoring
- **Reagent & Chemical Tracking:** Monitors solvents (Ethanol, Acetonitrile), corrosive acids (HCl 37%), molecular enzymes (Taq Master Mix), and sterile disposables (pipette filter tips, cryovials, nitrile gloves).
- **GHS Hazard Classification:** Visual indicators for Flammable, Corrosive, Toxic, Biohazard, and Standard safety classifications.
- **Automated Low-Stock Alerts:** Threshold monitors with visual warnings for **Low Stock** and **Critical Low (<50% safe buffer)**.
- **1-Click ERP Reorder:** Instant generation of Purchase Requisitions to institutional procurement pipelines.

### 4. 📈 Usage Reporting & Visual Analytics
- **Departmental Utilization Rates:** Interactive Chart.js visualizations showing active operating vs. idle hours across Genomics, Biochemistry, Analytical Chemistry, Microbiology, and Cell Culture labs.
- **Maintenance Spend vs. Downtime:** Historical dual-axis tracking of repair expenditure and equipment downtime hours.
- **Consumable Burn Rate Tracker:** Real-time burn rate vs. safe buffer margin comparisons.
- **Audit Export:** 1-click export of compliance audit reports in **CSV** or complete database backups in **JSON**.

### 5. 👥 Role-Based Access Control (RBAC)
- **Lab Administrator:** Full system control (asset onboarding, decommissioning, procurement approvals, compliance auditing).
- **Lab Researcher / Staff:** Equipment checkout/checkin, experimental runtime logging, chemical usage deduction, defect reporting.
- **Maintenance Engineer / Technician:** Service work orders, ISO calibration records, predictive sensor telemetry inspection.

### 6. 🤖 LabPulse AI Copilot (Natural Language Assistant)
- **Natural Language Asset Entry:** *"Add a Bio-Rad CFX96 PCR in Room 305 with cost $28,500 and serial BR-9981"* -> parses fields, assigns category, registers asset, and queues baseline calibration.
- **Stock Depletion & Restock:** *"Used 2 bottles of Ethanol in Room 210"* -> automatically decrements stock, compares against safety threshold, and issues reorder warning.
- **Predictive Diagnostics:** AI evaluates operating hours vs. MTBF and vibration sensor telemetry to flag high-risk equipment before catastrophic failure occurs.
- **Workflow & Layout Optimization:** AI recommends optimal placement (e.g. grouping microcentrifuges near PCR cyclers to save transit time, isolating analytical balances from incubator shaker vibrations).

### 7. 🏢 Institutional ERP & Finance Integration
- Integrated mock endpoints connecting to **SAP Ariba** and **Oracle Financials** with automated PO generation, vendor catalog references, and delivery lead-time tracking.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js (v18+)

### 2. Start the Server
```bash
cd C:\Users\suriy\.gemini\antigravity\scratch\smart-lab-inventory
npm start
```
The server will boot on `http://localhost:3000`.

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** in any modern web browser.

---

## 📂 Project Directory Structure

```
smart-lab-inventory/
├── package.json               # Dependencies and start scripts
├── server.js                  # Express REST API, Predictive AI engine, ERP Integration
├── README.md                  # Comprehensive system documentation
├── data/
│   ├── assets.json            # Equipment registry (12+ realistic lab instruments)
│   ├── consumables.json       # Chemical reagents, solvents, disposables
│   ├── maintenance.json       # Scheduled, overdue, and completed service tasks
│   ├── logs.json              # System transaction audit trail
│   └── procurement_orders.json# Generated ERP purchase orders
└── public/
    ├── index.html             # Single-Page Application interface
    ├── css/
    │   └── styles.css         # Custom styling, print media rules, badges
    └── js/
        ├── api.js             # Client API service wrapper
        ├── charts.js          # Chart.js visualization configurations
        ├── scanner.js         # Barcode (Code128), QR code generator & camera scanner
        ├── ai-agent.js        # LabPulse AI Copilot chat interface
        └── app.js             # Main state controller and RBAC manager
```

---

## 💬 Sample Prompts for LabPulse AI Copilot

You can type any of the following into the AI Copilot chat drawer:

1. **Predictive Maintenance:**
   > *"Run predictive maintenance diagnostics on all equipment"*
2. **Calibration Status:**
   > *"Which equipment is overdue for calibration?"*
3. **Consumable Depletion:**
   > *"Used 2 bottles of Ethanol in Room 210"*
4. **Natural Language Registration:**
   > *"Add a Mettler Toledo pH Meter in Analytical Chemistry Room 210 with cost $1,800"*
5. **Asset Inquiry & Warranty:**
   > *"What is the warranty and location of the TSX Freezer?"*
6. **Facility Layout Optimization:**
   > *"Suggest asset layout improvements for the genomics lab"*
