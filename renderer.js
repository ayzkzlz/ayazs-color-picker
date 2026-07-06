const { ipcRenderer } = require('electron');

const canvas = document.getElementById('screen-canvas');
const ctx = canvas.getContext('2d');

let globalScreensData = null;
let globalTotalBounds = null;

const lensContainer = document.getElementById('lens-container');
const lensCanvas = document.getElementById('lens-canvas');
const lensCtx = lensCanvas.getContext('2d');
const lensHex = document.getElementById('lens-hex');
const customCrosshair = document.getElementById('custom-crosshair');

lensCtx.imageSmoothingEnabled = false;

ipcRenderer.on('start-picking', (event, screensData, totalBounds, lensEnabled) => {
  globalScreensData = screensData;
  globalTotalBounds = totalBounds;
  
  if (lensEnabled) {
    document.body.classList.add('lens-enabled');
  } else {
    document.body.classList.remove('lens-enabled');
  }
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

ipcRenderer.on('toggle-dim', (event, show) => {
  if (show) {
    document.body.classList.add('dimmed');
  } else {
    document.body.classList.remove('dimmed');
  }
});

document.body.addEventListener('mousemove', (e) => {
  if (!document.body.classList.contains('picking') || document.body.classList.contains('dimmed')) {
    return;
  }
  
  const x = e.clientX;
  const y = e.clientY;

  // Özel imleci konumlandır
  customCrosshair.style.left = x + 'px';
  customCrosshair.style.top = y + 'px';

  if (!document.body.classList.contains('lens-enabled')) return;

  // Lensi bulunduğu ekranın sağ alt köşesine konumlandır
  if (globalScreensData && globalTotalBounds) {
    let currentDisplay = globalScreensData.find(d => 
      x >= d.bounds.x - globalTotalBounds.x && 
      x <= d.bounds.x - globalTotalBounds.x + d.bounds.width &&
      y >= d.bounds.y - globalTotalBounds.y &&
      y <= d.bounds.y - globalTotalBounds.y + d.bounds.height
    );

    if (currentDisplay) {
      // 24 piksel sağdan ve alttan boşluk
      const right = currentDisplay.bounds.x - globalTotalBounds.x + currentDisplay.bounds.width - 24;
      const bottom = currentDisplay.bounds.y - globalTotalBounds.y + currentDisplay.bounds.height - 24;

      const width = lensContainer.offsetWidth || 135;
      const height = lensContainer.offsetHeight || 165;
      
      lensContainer.style.left = (right - width) + 'px';
      lensContainer.style.top = (bottom - height) + 'px';
    }
  }

  // 15x15'lik bir alanı al (imleç tam ortada kalacak şekilde 7'şer piksel kenarlara)
  const sourceSize = 15;
  const sx = x - Math.floor(sourceSize / 2);
  const sy = y - Math.floor(sourceSize / 2);

  // Lensi siyah yap (out-of-bounds kenarlar temiz kalsın)
  lensCtx.fillStyle = '#0F0F0F';
  lensCtx.fillRect(0, 0, lensCanvas.width, lensCanvas.height);

  lensCtx.drawImage(
    canvas,
    sx, sy, sourceSize, sourceSize,
    0, 0, lensCanvas.width, lensCanvas.height
  );

  // HEX hesapla
  const pixelData = ctx.getImageData(x, y, 1, 1).data;
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => {
    const hex = v.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
  
  lensHex.innerText = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
});

document.body.addEventListener('mousedown', (e) => {
  if (document.body.classList.contains('dimmed')) return;
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
