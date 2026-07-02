const { app, BrowserWindow, globalShortcut, desktopCapturer, ipcMain, clipboard, Tray, Menu, screen, nativeImage } = require('electron');

let tray = null;
let pickerWindow = null;

// Birden fazla ekran varsa tüm ekranları kapsayacak ortak bir koordinat ve boyut hesaplar
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
    height: height + 1, // Windows görev çubuğunu (taskbar) aşması ve animasyon yapmaması için +1px hack
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
    type: 'toolbar', // İşletim sistemine bu pencerenin özel bir araç olduğunu söyler
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Görev çubuğunun ve tüm alt menülerin kesinlikle üstünde olmak için
  pickerWindow.setBounds({ x, y, width, height: height + 1 });
  pickerWindow.setAlwaysOnTop(true, 'screen-saver');

  pickerWindow.loadFile('index.html');
  // Başlangıçta fare tıklamalarını tamamen yok sayarak arkadaki uygulamalara geçirir
  pickerWindow.setIgnoreMouseEvents(true, { forward: true });

  pickerWindow.on('closed', () => {
    pickerWindow = null;
  });
}

app.whenReady().then(() => {
  createPickerWindow();

  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Color Picker App');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Çıkış', click: () => { app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);

  const ret = globalShortcut.register('CommandOrControl+Shift+H', async () => {
    if (pickerWindow) {
      try {
        const { x: totalX, y: totalY, width: totalWidth, height: totalHeight, displays } = getTotalBounds();

        // En büyük ekranın çözünürlüğüne göre kaliteyi ayarla
        let maxW = 0; let maxH = 0;
        displays.forEach(d => {
           const w = d.size.width * d.scaleFactor;
           const h = d.size.height * d.scaleFactor;
           if (w > maxW) maxW = w;
           if (h > maxH) maxH = h;
        });

        // Tüm ekranların resmini çek
        const sources = await desktopCapturer.getSources({ 
          types: ['screen'], 
          thumbnailSize: { width: maxW, height: maxH } 
        });
        
        // Her ekranın resmiyle o ekranın kendi koordinatlarını eşleştir
        const screensData = displays.map((d, index) => {
          let source = sources.find(s => s.display_id === d.id.toString());
          if (!source) source = sources[index]; // Fallback
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
  });

  if (!ret) {
    console.log('Kisayol kaydi basarisiz oldu.');
  } else {
    console.log('Uygulama hazir! Kisayol: Ctrl + Shift + H');
  }
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
