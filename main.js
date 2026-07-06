const { app, BrowserWindow, globalShortcut, desktopCapturer, ipcMain, clipboard, Tray, Menu, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let pickerWindow = null;
let settingsWindow = null;

// Ayarları kaydetmek için dosya yolu
const configPath = path.join(app.getPath('userData'), 'config.json');
let currentShortcut = 'CmdOrCtrl+Shift+X'; // Mac'te çakışmayan varsayılan
let lensEnabled = true;

// Eğer ayar dosyası varsa oku
if (fs.existsSync(configPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    currentShortcut = data.shortcut || currentShortcut;
    if (data.lensEnabled !== undefined) {
      lensEnabled = data.lensEnabled;
    }
  } catch(e) {}
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify({ shortcut: currentShortcut, lensEnabled }));
}

function updateTrayMenu() {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Kısayolu Yönet', click: () => openSettings() },
    { 
      label: lensEnabled ? 'Lensi Kapat' : 'Lensi Aç', 
      click: () => {
        lensEnabled = !lensEnabled;
        saveConfig();
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    { label: 'Çıkış', click: () => { app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
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
    icon: path.join(__dirname, 'icon.png'),
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
  
  if (pickerWindow) {
    pickerWindow.setIgnoreMouseEvents(false);
    pickerWindow.webContents.send('toggle-dim', true);
  }

  // Kısayol değiştirirken uygulamanın tetiklenmemesi için tüm global kısayolları iptal et
  globalShortcut.unregisterAll();

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

  settingsWindow.setAlwaysOnTop(true, 'screen-saver');
  
  settingsWindow.loadFile('settings.html');
  
  settingsWindow.webContents.on('did-finish-load', () => {
    settingsWindow.webContents.send('current-shortcut', currentShortcut);
  });
  
  settingsWindow.on('blur', () => {
    if (settingsWindow) settingsWindow.close();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    
    // Ayarlar penceresi kapandığında kısayolu tekrar kaydet
    registerShortcut();
    
    if (pickerWindow) {
      pickerWindow.setIgnoreMouseEvents(true, { forward: true });
      pickerWindow.webContents.send('toggle-dim', false);
    }
  });
}

let isPicking = false;

const handleHotkey = async () => {
  if (settingsWindow) return; // Ayar penceresi açıksa kısayolu yoksay
  if (isPicking) return; // Zaten seçim işlemi sürüyorsa (veya başlıyorsa) yoksay
  isPicking = true;

  if (pickerWindow) {
    try {
      // MacOS Space/Sanal Masaüstü (üç parmak kaydırma) geçişlerinde pencere kaybolmasın diye
      // her kısayola basıldığında pencereyi bulunulan ekrana ve en üste zorluyoruz.
      pickerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      pickerWindow.setAlwaysOnTop(true, 'screen-saver', 2);
      
      const { x: totalX, y: totalY, width: totalWidth, height: totalHeight, displays } = getTotalBounds();
      
      // Monitör değişimi/çözünürlük değişimi ihtimaline karşı bounds'u da yeniliyoruz
      pickerWindow.setBounds({ x: totalX, y: totalY, width: totalWidth, height: totalHeight + 1 });

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

      pickerWindow.webContents.send('start-picking', screensData, { x: totalX, y: totalY, width: totalWidth, height: totalHeight }, lensEnabled);
    } catch (err) {
      isPicking = false;
      console.error("Ekran yakalama hatasi:", err);
    }
  } else {
    isPicking = false;
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

  const iconPath = path.join(__dirname, 'icon.png');
  let trayIcon = nativeImage.createFromPath(iconPath);
  
  if (process.platform === 'darwin') {
    app.dock.hide(); // Mac'te dock'tan gizle, sadece tray'de çalışsın
    trayIcon = trayIcon.resize({ width: 16, height: 16 }); // Mac tray menüsü için uygun boyut
  } else {
    trayIcon = trayIcon.resize({ width: 32, height: 32 }); // Windows için tray boyutuna optimize edildi
  }
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Global Color Picker');
  
  updateTrayMenu();

  registerShortcut();

  // İşletim sistemi başladığında otomatik çalıştır
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true, // Mac için arka planda sessizce açılmasını sağlar
    args: [
      '--processStart', `"${app.name}"`,
      '--process-start-args', `"--hidden"`
    ] // Windows için gizli başlatma parametreleri
  });
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
  isPicking = false;
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
