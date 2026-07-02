const { ipcRenderer } = require('electron');

const canvas = document.getElementById('screen-canvas');
const ctx = canvas.getContext('2d');

ipcRenderer.on('start-picking', (event, screensData, totalBounds) => {
  // Tuvali tüm monitörlerin toplam alanına göre ayarla
  canvas.width = totalBounds.width;
  canvas.height = totalBounds.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let loadedCount = 0;

  // Her monitörün resmini kendi doğru koordinatına (offset) çiz
  screensData.forEach(data => {
    const img = new Image();
    img.onload = () => {
      const drawX = data.bounds.x - totalBounds.x;
      const drawY = data.bounds.y - totalBounds.y;
      
      ctx.drawImage(img, drawX, drawY, data.bounds.width, data.bounds.height);
      
      loadedCount++;
      // Tüm monitör resimleri çizildiğinde sistemi aktif et
      if (loadedCount === screensData.length) {
        document.body.classList.add('picking');
        ipcRenderer.send('picking-ready');
      }
    };
    img.src = data.imageUri;
  });
});

function endPicking() {
  document.body.classList.remove('picking');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ipcRenderer.send('stop-picking');
}

document.body.addEventListener('mousedown', (e) => {
  if (!document.body.classList.contains('picking')) return;
  
  if (e.button === 0) { // Sol tık
    // Farenin bulunduğu pencere koordinatı doğrudan canvas koordinatıdır
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
  
  endPicking();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('picking')) {
    endPicking();
  }
});
