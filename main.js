import { app, BrowserWindow, Tray, Menu } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'build/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
    },
  });

  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('force_high_performance_gpu');

  // mainWindow.loadURL(`file://${path.join(__dirname, 'build/index.html')}`);
  mainWindow.loadURL('http://localhost:3000');

  tray = new Tray(path.join(__dirname, 'build/favicon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть приложение',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      },
    },
    {
      label: 'Выход',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Мое приложение');
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    if (mainWindow) {
      mainWindow.hide();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      icon: path.join(__dirname, 'build/favicon.ico'),
      webPreferences: {
        nodeIntegration: true,
      },
    });
    mainWindow.loadURL('http://localhost:3000');
  }
});
