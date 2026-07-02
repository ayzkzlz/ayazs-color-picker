const { ipcRenderer } = require('electron');

const canvas = document.getElementById('screen-canvas');
const ctx = canvas.getContext('2d');

ipcRenderer.on('set-image', (event, imageUri) => {
  const img = new Image();
  img.onload = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Resmi ekran boyutlarına sığdırarak çiz
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Çizim bittiğinde ana pencereye göster komutu yolla
    ipcRenderer.send('ready-to-show');
  };
  img.src = imageUri;
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) { // Sol tık
    const x = e.clientX;
    const y = e.clientY;
    
    // Tıklanan pikselin verisini al
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    const r = pixelData[0];
    const g = pixelData[1];
    const b = pixelData[2];
    
    // RGB to Hex
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
    
    const hexColor = rgbToHex(r, g, b);
    
    // Rengi ana prosese (main.js) gönder
    ipcRenderer.send('color-picked', hexColor);
  } else if (e.button === 2) { // Sağ tık yaparsa işlemi iptal et
    ipcRenderer.send('close-picker');
  }
});

// ESC tuşu ile işlemi iptal et
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ipcRenderer.send('close-picker');
  }
});
