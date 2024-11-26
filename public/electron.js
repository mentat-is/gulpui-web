const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'GULP | Web Client',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
    },
    icon: path.join(__dirname, 'favicon.png'),
    autoHideMenuBar: true
  });

  mainWindow.maximize();
  mainWindow.show();

  const startUrl = process.env.ELECTRON_START_URL || path.join(__dirname, '../build/index.html');
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => (mainWindow = null));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
