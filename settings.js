const { ipcRenderer } = require('electron');

const input = document.getElementById('shortcut-input');
let shortcutStr = '';
const isMac = navigator.userAgent.toLowerCase().indexOf('mac') !== -1;

function formatDisplay(str) {
  if (isMac) {
    return str.replace(/CommandOrControl|CmdOrCtrl/g, 'Cmd')
              .replace(/Command|Super/g, 'Cmd')
              .replace(/Control/g, 'Ctrl');
  } else {
    return str.replace(/CommandOrControl|CmdOrCtrl/g, 'Ctrl')
              .replace(/Command|Super/g, 'Win')
              .replace(/Control/g, 'Ctrl');
  }
}

ipcRenderer.on('current-shortcut', (e, shortcut) => {
  shortcutStr = shortcut;
  input.value = formatDisplay(shortcut);
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
  
  if (e.metaKey) parts.push(isMac ? 'Cmd' : 'Super');
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  
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
  input.value = formatDisplay(shortcutStr);
});
