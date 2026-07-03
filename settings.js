const { ipcRenderer } = require('electron');

const input = document.getElementById('shortcut-input');
let shortcutStr = '';

ipcRenderer.on('current-shortcut', (e, shortcut) => {
  input.value = shortcut.replace(/CommandOrControl/g, 'Ctrl');
  shortcutStr = shortcut;
  input.focus();
});

// Kutudan odak kaybolmasın
document.body.addEventListener('click', () => input.focus());

input.addEventListener('keydown', (e) => {
  e.preventDefault();
  
  const key = e.key;
  if (key === 'Escape') {
    ipcRenderer.send('close-settings');
    return;
  }
  
  if (key === 'Enter') {
    if (shortcutStr && !shortcutStr.endsWith('+')) {
      ipcRenderer.send('update-shortcut', shortcutStr);
    }
    return;
  }
  
  let parts = [];
  
  if (e.ctrlKey) parts.push('CommandOrControl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Super');
  
  let k = key.toUpperCase();
  if (!['CONTROL', 'ALT', 'SHIFT', 'META', 'ENTER'].includes(k)) {
    if (k === ' ') {
      parts.push('Space');
    } else if (k.length === 1) {
      parts.push(k);
    } else {
      parts.push(key); 
    }
  }
  
  parts = [...new Set(parts)];
  shortcutStr = parts.join('+');
  input.value = shortcutStr.replace(/CommandOrControl/g, 'Ctrl');
});
