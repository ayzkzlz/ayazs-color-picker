const { ipcRenderer } = require('electron');

const canvas = document.getElementById('screen-canvas');
const ctx = canvas.getContext('2d');

ipcRenderer.on('start-picking', (event, imageUri, screenBounds) => {
  const img = new Image();
  img.onload = () => {
    // Ekran boyutunu birebir kullan
    canvas.width = screenBounds.width;
    canvas.height = screenBounds.height;
    
    // Resmi çizdiğimiz an, şeffaflık ortadan kalkar ve arkadaki uygulamalar erişilmez olur.
    // Ancak resim gerçek ekranla birebir aynı olduğu için kullanıcı fark etmez.
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    document.body.classList.add('picking');
    
    // Main prosese artık tıklamaları yakalayabileceğini söyle
    ipcRenderer.send('picking-ready');
  };
  img.src = imageUri;
});

function endPicking() {
  document.body.classList.remove('picking');
  // Canvas'ı temizle ki tekrar şeffaf olsun
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ipcRenderer.send('stop-picking');
}

document.body.addEventListener('mousedown', (e) => {
  if (!document.body.classList.contains('picking')) return;
  
  if (e.button === 0) { // Sol tık
    // Tıklanan yerin rengini direkt çizili canvas'tan al
    const pixelData = ctx.getImageData(e.clientX, e.clientY, 1, 1).data;
    const r = pixelData[0];
    const g = pixelData[1];
    const b = pixelData[2];
    
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
    
    const hexColor = rgbToHex(r, g, b);
    ipcRenderer.send('color-picked', hexColor);
  }
  
  // İşlem bitince (veya sağ tıkla iptal edilince) kapat
  endPicking();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('picking')) {
    endPicking();
  }
});
