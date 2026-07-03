const { app, BrowserWindow, globalShortcut, desktopCapturer, ipcMain, clipboard, Tray, Menu, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let pickerWindow = null;
let settingsWindow = null;

// Ayarları kaydetmek için dosya yolu
const configPath = path.join(app.getPath('userData'), 'config.json');
let currentShortcut = 'CommandOrControl+Shift+H'; // Varsayılan

// Eğer ayar dosyası varsa oku
if (fs.existsSync(configPath)) {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    currentShortcut = JSON.parse(data).shortcut || currentShortcut;
  } catch(e) {}
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify({ shortcut: currentShortcut }));
}

function getTotalBounds() {
  const displays = screen.getAllDisplays();
  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  
  displays.forEach(d => {
    if (d.bounds.x < minX) minX = d.bounds.x;
    if (d.bounds.y < minY) minY = d.bounds.y;
    if (d.bounds.x + d.bounds.width > maxX) maxX = d.bounds.x + d.bounds.width;
    if (d.bounds.y + d.bounds.height > maxY) maxY = d.bounds.y + d.bounds.height;
  });

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, displays };
}

function createPickerWindow() {
  const { x, y, width, height } = getTotalBounds();

  pickerWindow = new BrowserWindow({
    x: x,
    y: y,
    width: width,
    height: height + 1,
    icon: path.join(__dirname, 'icon.ico'),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    thickFrame: false,
    enableLargerThanScreen: true,
    type: 'toolbar',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  pickerWindow.setBounds({ x, y, width, height: height + 1 });
  pickerWindow.setAlwaysOnTop(true, 'screen-saver');

  pickerWindow.loadFile('index.html');
  pickerWindow.setIgnoreMouseEvents(true, { forward: true });

  pickerWindow.on('closed', () => {
    pickerWindow = null;
  });
}

function openSettings() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  
  settingsWindow = new BrowserWindow({
    width: 320,
    height: 130,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  settingsWindow.loadFile('settings.html');
  
  settingsWindow.webContents.on('did-finish-load', () => {
    settingsWindow.webContents.send('current-shortcut', currentShortcut);
  });
  
  // Ekranda başka yere tıklanırsa ayarlar menüsünü direkt kapat (minimalist davranış)
  settingsWindow.on('blur', () => {
    if (settingsWindow) settingsWindow.close();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

const handleHotkey = async () => {
  if (pickerWindow) {
    try {
      const { x: totalX, y: totalY, width: totalWidth, height: totalHeight, displays } = getTotalBounds();

      let maxW = 0; let maxH = 0;
      displays.forEach(d => {
         const w = d.size.width * d.scaleFactor;
         const h = d.size.height * d.scaleFactor;
         if (w > maxW) maxW = w;
         if (h > maxH) maxH = h;
      });

      const sources = await desktopCapturer.getSources({ 
        types: ['screen'], 
        thumbnailSize: { width: maxW, height: maxH } 
      });
      
      const screensData = displays.map((d, index) => {
        let source = sources.find(s => s.display_id === d.id.toString());
        if (!source) source = sources[index]; 
        return {
           imageUri: source.thumbnail.toDataURL(),
           bounds: d.bounds
        };
      });

      pickerWindow.webContents.send('start-picking', screensData, { x: totalX, y: totalY, width: totalWidth, height: totalHeight });
    } catch (err) {
      console.error("Ekran yakalama hatasi:", err);
    }
  }
};

function registerShortcut() {
  globalShortcut.unregisterAll();
  const ret = globalShortcut.register(currentShortcut, handleHotkey);
  if (!ret) {
    console.log('Kisayol kaydi basarisiz oldu:', currentShortcut);
  } else {
    console.log('Uygulama hazir! Kisayol:', currentShortcut);
  }
}

app.whenReady().then(() => {
  createPickerWindow();

  const iconPath = path.join(__dirname, 'icon.ico');
  tray = new Tray(iconPath);
  tray.setToolTip('Color Picker App');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Ayarlar', click: () => openSettings() },
    { type: 'separator' },
    { label: 'Çıkış', click: () => { app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);

  registerShortcut();
});

app.on('window-all-closed', () => {
  // Arka planda kalmaya devam et
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('picking-ready', () => {
  if (pickerWindow) {
    pickerWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('stop-picking', () => {
  if (pickerWindow) {
    pickerWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});

ipcMain.on('color-picked', (event, hexColor) => {
  clipboard.writeText(hexColor);
  console.log(`Kopyalandi: ${hexColor}`);
});

ipcMain.on('update-shortcut', (event, newShortcut) => {
  currentShortcut = newShortcut;
  saveConfig();
  registerShortcut();
  if (settingsWindow) {
    settingsWindow.close();
  }
});

ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});
