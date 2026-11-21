# OS-Vision: Interactive Operating System Scheduling and Resource Management Simulator

**OS-Vision** is an interactive, browser-based simulator engineered for computer science students and educators to visualize, simulate, and analyze foundational Operating System mechanisms.

---

## 📌 Project Status: Stage 1 Foundation Complete

This repository contains the architecture, server backend, and user interface foundation for **OS-Vision**:
- **Backend:** Node.js & Express.js server providing routing, static asset delivery, and a telemetry health-check API.
- **Frontend:** Responsive, modern dark-themed dashboard built with HTML5, CSS3, and vanilla JavaScript (no heavy frontend frameworks required).
- **Navigation:** Functional sidebar and interconnected routing between the Dashboard and 3 core module workbenches:
  1. **CPU Scheduling Simulator** (Stage 2)
  2. **Memory Management Simulator** (Stage 3)
  3. **Deadlock Management Simulator** (Stage 4)
- **Diagnostics:** Live health-check telemetry endpoint (`/api/health`) and client-side status polling.

---

## 🛠️ Technology Stack

- **Backend:** Node.js (>= v18.x), Express.js (v4.x)
- **Frontend:** Modern Semantic HTML5, CSS3 Custom Properties (Design System), Vanilla ES6+ JavaScript
- **Testing:** Node.js native test runner (`node:test`, `node:assert`)
- **Package Manager:** npm

---

## 📁 Project Directory Structure

```text
├── public/                     # Client-side static assets
│   ├── css/
│   │   ├── styles.css          # Design system, CSS variables, dark theme, sidebar & responsive layout
│   │   ├── dashboard.css       # Dashboard metrics, hero banner, module cards grid
│   │   └── modules.css         # Placeholder module pages styling & wireframe canvases
│   ├── js/
│   │   ├── app.js              # Sidebar toggle, digital clock, live /api/health polling, toasts
│   │   └── modules.js          # Algorithm tabs, specifications, and placeholder feedback
│   ├── pages/
│   │   ├── cpu-scheduling.html      # CPU Scheduling workbench (Stage 2 placeholder)
│   │   ├── memory-management.html   # Memory Management workbench (Stage 3 placeholder)
│   │   ├── deadlock-management.html # Deadlock Management workbench (Stage 4 placeholder)
│   │   └── 404.html                 # Custom dark 404 page
│   └── index.html              # Main OS-Vision Dashboard
├── src/                        # Backend application code
│   ├── routes/
│   │   └── api.js              # REST endpoints (/api/health)
│   └── app.js                  # Express middleware, logging, and routing
├── tests/
│   └── server.test.js          # Automated integration and route verification tests
├── .gitignore                  # Git exclusions (node_modules, logs, etc.)
├── package.json                # Project dependencies and npm scripts
├── server.js                   # Application entrypoint & HTTP server listener
└── README.md                   # Project documentation and run guide
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have **Node.js** (v18 or higher) installed:
```powershell
node -v
```

### 2. Install Dependencies
Install the required Node.js packages:
```powershell
npm install
```
*(On Windows PowerShell, if script execution policy restricts `npm.ps1`, run `npm.cmd install`)*

### 3. Run the Application
Start the OS-Vision Express server:
```powershell
npm start
```
*Or directly via Node:*
```powershell
node server.js
```

### 4. Open in Your Browser
Once started, open your web browser and navigate to:
```text
http://localhost:3000
```

---

## 🌐 Application Endpoints & Routes

| Path | Method | Description |
|---|---|---|
| `/` | `GET` | Main Dashboard with system status, metrics, and module cards |
| `/cpu-scheduling` | `GET` | CPU Scheduling Simulator workbench |
| `/memory-management` | `GET` | Memory Management Simulator workbench |
| `/deadlock-management` | `GET` | Deadlock Management Simulator workbench |
| `/api/health` | `GET` | Health telemetry endpoint (JSON) reporting status, uptime, and module state |

---

## 🧪 Running Automated Tests

OS-Vision includes an automated test suite verifying server initialization, all routes, static assets, and the `/api/health` payload:
```powershell
npm test
```
*Or directly with Node's native test runner:*
```powershell
node --test tests/server.test.js
```

---

## 🗺️ Capstone Project Roadmap

- [x] **Stage 1: Foundation (Current)**
  - Clean project architecture & package configuration
  - Express.js server & API health-check endpoint
  - Responsive dark-themed UI design system
  - Dashboard with sidebar and 3 module cards
  - Working navigation to placeholder module pages
  - Automated integration test suite
- [ ] **Stage 2: CPU Scheduling Simulator**
  - Process creation & parameter configuration (Arrival, Burst, Priority)
  - FCFS, SJF, SRTF, Round Robin, and Priority Scheduling algorithms
  - Interactive Gantt chart visualization & execution timeline
  - Turnaround Time (TAT) and Waiting Time (WT) analytics
- [ ] **Stage 3: Memory Management Simulator**
  - Dynamic partition allocation (First-Fit, Best-Fit, Worst-Fit)
  - Memory map visualization & fragmentation tracking
  - Paging address translation simulation
  - Virtual memory page replacement algorithms (FIFO, LRU, Optimal)
- [ ] **Stage 4: Deadlock Management Simulator**
  - Banker's Algorithm safety state verification and resource request handling
  - Resource Allocation Graph (RAG) interactive canvas
  - Cycle detection for single- and multi-instance resource systems
  - Deadlock recovery simulation (process termination & resource preemption)
