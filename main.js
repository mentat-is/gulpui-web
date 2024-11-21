const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let window;
let tray;

app.on('ready', () => {
  window = new BrowserWindow({
    icon: path.join(__dirname, 'build/favicon.png'),
    webPreferences: {
      nodeIntegration: true,
    },
    show: false
  });

  window.setMenu(null);

  window.maximize();

  window.show();

  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('force_high_performance_gpu');

  window.loadURL('http://localhost:3000');

  tray = new Tray(path.join(__dirname, 'build/favicon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть приложение',
      click: () => {
        window.show();
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
    window.isVisible() ? window.hide() : window.show();
  });

  window.on('close', (event) => {
    event.preventDefault();
    window.hide();
  });
});