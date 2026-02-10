# MV PIPE - Oracle Database Load Monitoring Dashboard

MV PIPE is a desktop application built with Electron + React (Vite) to monitor heavy data load operations in Oracle databases. It provides a real-time dashboard focused on active sessions, performance impact, and resource consumption.

<div align="center">
  <br />
  <p>
    <a href="https://github.com/TDamiao/MVPipe/releases"><img src="https://i.imgur.com/t0n2hO3.png" width="2000" alt="Print" /></a>
  </p>
  <br />
  <p>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT" /></a>
  </p>
</div>

## Features

- Multi-connection management (one tab per database).
- Real-time dashboard for active load sessions and performance metrics.
- Summary cards for sessions, volume estimates, locks, and top tables.
- Detailed session table (SID, owner, operation, duration, estimated MB, impact).
- Client-side filtering by owner, operation, duration, impact, or table.
- Secure: passwords are kept in memory only (never written to disk).
- Fallback queries when access to `v$sql` is not available.

## Tech Stack

- Electron (main process)
- React + TypeScript (renderer)
- Vite (build)
- Oracle connectivity via `oracledb` (thick mode)

---

## Prerequisites

1. Node.js (LTS recommended).
2. Oracle Instant Client (required by `node-oracledb`).

## Setup: Oracle Instant Client (Bundled)

This app uses a bundled Instant Client. You must download and place it inside the project before running or building.

### Required Steps

1. Create the directory:

```
/vendor/instantclient
```

2. Download Oracle Instant Client (Basic or Basic Light).
3. Extract all files directly into `vendor/instantclient` (do not create an extra subfolder).

### Expected folder structure

```
/vendor/instantclient
  adrci.exe
  BASIC_README
  oci.dll
  ociw32.dll
  oraociei19.dll
  ...
```

Note: `vendor/` is ignored by Git and must not be committed.

---

## Installation & Running

1. Install dependencies:

```bash
npm install
```

2. Run in development mode:

```bash
npm run dev
```

## Building for Production (Windows)

```bash
npm run build
```

Artifacts are generated in `dist/`:

- `dist/MV Pipe Setup 1.0.0.exe` (installer to publish)
- `dist/latest.yml` (only needed if you later enable auto-update)
- `dist/win-unpacked/` (unpacked app, useful for debugging)

To publish a manual release, share only the `.exe` installer. For auto-update in the future, publish the `.exe` and `latest.yml` (and any `.blockmap` files if present).

---

## How to Use

1. Launch the app.
2. Click **New Connection**.
3. Fill in the Oracle connection details (prefer read-only access to `v$` views).
4. Click **Connect & Monitor**.
5. A new tab opens and the dashboard starts polling.
