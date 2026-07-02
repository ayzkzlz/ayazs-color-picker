const { app, BrowserWindow, globalShortcut, desktopCapturer, ipcMain, clipboard, Tray, Menu, screen, nativeImage } = require('electron');

let tray = null;
let pickerWindow = null;

function createPickerWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  pickerWindow = new BrowserWindow({
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    width: width,
    height: height,
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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Windows'ta görev çubuğu menüleri (thumbnail) en üst katmanda (z-index) yer alır.
  // Bizim penceremizin bunların da üstüne çıkabilmesi için 'screen-saver' seviyesini kullanıyoruz.
  pickerWindow.setAlwaysOnTop(true, 'screen-saver');

  pickerWindow.loadFile('index.html');
  // Başlangıçta fare tıklamalarını tamamen yok sayarak arkadaki uygulamalara geçirir (görünmez pencere)
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
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        const scaleFactor = primaryDisplay.scaleFactor;

        // Kısayola basıldığı an ekranı dondurmak için resmi çekiyoruz
        const sources = await desktopCapturer.getSources({ 
          types: ['screen'], 
          thumbnailSize: { 
            width: width * scaleFactor, 
            height: height * scaleFactor 
          } 
        });
        
        const source = sources[0];
        const imageUri = source.thumbnail.toDataURL();

        pickerWindow.webContents.send('start-picking', imageUri, { width, height });
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
  // Resim arayüze çizildiği an artık fare tıklamalarını KENDİSİ yakalamalı (arkaya geçirmemeli)
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
