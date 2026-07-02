const { app, BrowserWindow, globalShortcut, desktopCapturer, ipcMain, clipboard, Tray, Menu, screen, nativeImage } = require('electron');

let tray = null;
let pickerWindow = null;

function captureScreenAndShowPicker() {
  if (pickerWindow) return; // Zaten açıksa işlem yapma

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const scaleFactor = primaryDisplay.scaleFactor;

  // Ekranın anlık görüntüsünü alıyoruz
  desktopCapturer.getSources({ 
    types: ['screen'], 
    thumbnailSize: { 
      width: width * scaleFactor, 
      height: height * scaleFactor 
    } 
  }).then(async sources => {
    const source = sources[0]; // Ana ekranı seç
    const imageUri = source.thumbnail.toDataURL();

    // Tam ekran, şeffaf bir çerçevesiz pencere oluştur
    pickerWindow = new BrowserWindow({
      width: width,
      height: height,
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false, // Pencereyi resim çizilene kadar gizle
      enableLargerThanScreen: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    pickerWindow.loadFile('index.html');
    
    // Pencere yüklendiğinde alınan ekran görüntüsünü arayüze gönder
    pickerWindow.webContents.on('did-finish-load', () => {
      pickerWindow.webContents.send('set-image', imageUri);
    });

    pickerWindow.on('closed', () => {
      pickerWindow = null;
    });
  }).catch(err => {
    console.error("Ekran yakalama hatası:", err);
  });
}

app.whenReady().then(() => {
  // Sistem tepsisi (Tray) ikonu
  const icon = nativeImage.createEmpty(); // Şimdilik boş bir ikon
  tray = new Tray(icon);
  tray.setToolTip('Color Picker App');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Çıkış', click: () => { app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);

  // Kısayol kaydı
  const ret = globalShortcut.register('CommandOrControl+Alt+H', () => {
    captureScreenAndShowPicker();
  });

  if (!ret) {
    console.log('Kısayol kaydı başarısız oldu.');
  } else {
    console.log('Kısayol başarıyla kaydedildi: Ctrl+Alt+H veya Cmd+Alt+H');
  }
});

app.on('window-all-closed', () => {
  // Arka planda çalışması için uygulamayı kapatmıyoruz
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Dinleyicileri (Arayüzden gelen mesajları yakalar)
ipcMain.on('color-picked', (event, hexColor) => {
  clipboard.writeText(hexColor);
  console.log(`Kopyalandı: ${hexColor}`);
  if (pickerWindow) {
    pickerWindow.close();
  }
});

ipcMain.on('close-picker', () => {
  if (pickerWindow) {
    pickerWindow.close();
  }
});

ipcMain.on('ready-to-show', () => {
  if (pickerWindow) {
    pickerWindow.show();
  }
});
