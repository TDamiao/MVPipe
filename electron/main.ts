import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import * as oracleService from './oracleService';

const guardStreamWrite = (stream: NodeJS.WriteStream | undefined) => {
  if (!stream) return;
  const original = stream.write.bind(stream);
  stream.write = ((chunk: any, ...rest: any[]) => {
    try {
      return original(chunk, ...rest);
    } catch {
      // Ignore EPIPE/broken pipe and any stream write failures.
      return false;
    }
  }) as typeof stream.write;
};

guardStreamWrite(process.stdout);
guardStreamWrite(process.stderr);

const ignoreEpipe = (err: unknown) => {
  if (err && typeof err === 'object' && 'code' in err && (err as any).code === 'EPIPE') {
    return;
  }
};

process.stdout?.on('error', ignoreEpipe);
process.stderr?.on('error', ignoreEpipe);

const guardConsoleWrite = (method: 'log' | 'warn' | 'error') => {
  const original = console[method];
  console[method] = (...args: unknown[]) => {
    try {
      original.apply(console, args);
    } catch {
      // Ignore logging failures (e.g., EPIPE/broken pipe).
    }
  };
};

guardConsoleWrite('log');
guardConsoleWrite('warn');
guardConsoleWrite('error');

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

const DIST = process.env.DIST ?? path.join(__dirname, '../dist');
const VITE_PUBLIC = process.env.VITE_PUBLIC ?? path.join(DIST, '../public');


let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(VITE_PUBLIC, 'logo.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.maximize();

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(DIST, 'index.html'));
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
