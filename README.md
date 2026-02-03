# MV PIPE - Oracle Database Load Monitoring Dashboard

MV PIPE is a cross-platform desktop application built with Electron and React to monitor heavy data load operations in an Oracle database. It provides a real-time dashboard focused on active sessions, performance impact, and resource consumption.

![App Screenshot](https://i.imgur.com/YOUR_SCREENSHOT_URL.png) <!-- Replace with a real screenshot later -->

## Features

- **Multi-Connection Management**: Monitor multiple Oracle databases simultaneously, each in its own tab.
- **Real-time Dashboard**: View active data load sessions with key performance metrics.
- **Summary Cards**: Get a quick overview of active sessions, estimated data volume, detected locks, and top affected tables.
- **Detailed Session Table**: Analyze individual sessions with details like SID, owner, operation type, duration, estimated weight (MB), and performance impact.
- **Client-Side Filtering**: Instantly filter the session list by owner, operation, duration, impact, or table name.
- **Secure**: Database passwords are never persisted to disk and are only held in memory for the duration of the session.
- **Graceful Degradation**: If the connected user lacks permissions for `v$sql`, the app falls back to a simpler view using `v$session` data.

## Tech Stack

- **Framework**: Electron
- **UI**: React, TypeScript, Material-UI
- **Backend (Main Process)**: Node.js
- **Oracle Connectivity**: `node-oracledb`

---

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js**: [Download & Install Node.js](https://nodejs.org/) (LTS version recommended).
2.  **Oracle Instant Client**: The `node-oracledb` library requires the Oracle Instant Client libraries to be installed and available in your system's path.

## Setup: Oracle Instant Client

This application uses a **"bundled"** Oracle Instant Client. This means the necessary Oracle libraries are loaded directly from a folder inside the project, avoiding any changes to your system's environment variables (like `PATH`).

You must manually download the Instant Client and place its files in the correct location before the application can run.

### Required Steps

1.  **Create Directories**
    
    In the root of the project, ensure the following folder structure exists:
    
    ```
    /vendor
    └── /instantclient
    ```

2.  **Download Oracle Instant Client**
    
    *   Go to the [Oracle Instant Client Downloads page](https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html).
    *   Download the **"Basic"** or **"Basic Light"** package ZIP file for your operating system (e.g., Windows x64).

3.  **Extract Files**
    
    *   Open the downloaded ZIP file.
    *   Extract **all the contents** directly into the `vendor/instantclient` folder.
    *   **Important:** Do not create an extra subdirectory when you unzip. The files (`oci.dll`, etc.) must be at the root of the `instantclient` folder.

### Final Folder Structure Verification

After extracting, your `vendor/instantclient` folder should look similar to this:

```
/vendor
└── /instantclient
    ├── adrci.exe
    ├── BASIC_README
    ├── oci.dll          <-- Key file
    ├── ociw32.dll
    ├── oraociei19.dll   <-- and other .dll files
    └── ... (etc)
```

### Note on Version Control (GitHub)

The `vendor` directory is intentionally excluded from Git by the `.gitignore` file. You should **not** commit the Oracle Instant Client binaries to your repository due to their large size and Oracle's licensing terms. Each developer on the project is expected to perform the setup steps above.

---

## Installation & Running

Once the Oracle Instant Client files are in place, you can proceed.

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run in Development Mode:**
    ```bash
    npm run dev
    ```

## Building for Production

To build a distributable package for your operating system:

```bash
npm run build
```
This will create an executable in the `dist` folder. The built application will correctly bundle the `instantclient` files you provided.

## How to Use

1.  Launch the application.
2.  Click the **"New Connection"** button.
3.  Fill in the connection details for your Oracle database. The user should ideally have read-only access to `v$` views (`v$session`, `v$sql`, `v$lock`).
4.  Click **"Connect & Monitor"**.
5.  A new tab will appear for your connection, and the dashboard will start polling for data.
