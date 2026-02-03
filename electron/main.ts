import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import * as oracleService from './oracleService';

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');


let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC, 'logo.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  try {
    // Determine the path to the bundled Oracle Instant Client.
    const instantClientPath = app.isPackaged
      ? path.join(process.resourcesPath, 'instantclient')
      // In development, use process.cwd() which is the project root.
      : path.join(process.cwd(), 'vendor', 'instantclient');

    // Explicitly initialize Oracle Client in Thick Mode from the bundled path.
    oracleService.initializeOracleClient(instantClientPath);
  } catch (err: any) {
    dialog.showErrorBox(
        'Oracle Client Initialization Error',
        'Failed to initialize bundled Oracle Thick mode. Please ensure the Oracle Instant Client files are correctly placed in the \'vendor/instantclient\' directory.\n\n' +
        'Error: ' + err.message
    );
  }

  // Handle IPC calls from renderer
  ipcMain.handle('oracle:connect', async (_, details) => {
    return oracleService.connect(details);
  });
  ipcMain.handle('oracle:fetchData', async (_, connectionId) => {
    return oracleService.fetchData(connectionId);
  });
  ipcMain.handle('oracle:disconnect', async (_, connectionId) => {
    return oracleService.disconnect(connectionId);
  });

  createWindow();
});
