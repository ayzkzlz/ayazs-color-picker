# Global Color Picker

A lightweight, seamless, and cross-platform desktop color picker built with Electron.js. It runs silently in the system tray and allows users to grab the exact HEX color code of any pixel across all their screens instantly using a customizable global hotkey.

## Features
- **Multi-Monitor Support:** Automatically calculates total bounds to flawlessly capture and pick colors across dual monitors or ultrawide setups.
- **Zero UI Clutter:** The application is completely invisible. No screen flashing, no "window-within-a-window" artifacts, and no borders.
- **Taskbar & Tooltip Overlay:** Implements advanced native window hacks (`+1px` height bypass & `toolbar` type) on Windows to ensure it can overlay and capture colors from native taskbars and topmost OS tooltips.
- **Cinematic Focus Mode:** Opening the settings menu dims the entire global desktop to prevent interaction with underlying apps, bringing absolute focus to the settings widget.
- **Ultra-Minimal Settings:** A frameless, sleek widget to easily remap the global shortcut (Supports 3-key and 4-key combinations like `Ctrl+Shift+H` or `Ctrl+Alt+Shift+H`).
- **Instant Clipboard:** Instantly copies the selected HEX code to your clipboard without any popups.

## Installation & Usage
```bash
# Install dependencies
npm install

# Run the app
npm start
```
By default, the hotkey is `Ctrl+Shift+H`. You can change this by right-clicking the tray icon and selecting "Ayarlar" (Settings).

---

# Global Color Picker (Türkçe)

Electron.js ile geliştirilmiş hafif, pürüzsüz ve arka planda sessizce çalışan bir masaüstü renk seçici uygulaması. Özelleştirilebilir bir global kısayol tuşu ile ekrandaki (tüm monitörlerinizdeki) herhangi bir noktanın HEX renk kodunu anında panoya kopyalamanızı sağlar.

## Özellikler
- **Çoklu Ekran Desteği:** Çift monitör veya ultra geniş ekran kurulumlarında tüm ekranları başarıyla kapsar.
- **Sıfır Arayüz Karmaşası:** Tetiklenene kadar tamamen görünmezdir. Ekran yanıp sönmesi veya pencere açılma animasyonları barındırmaz.
- **Görev Çubuğu ve Menü Aşımı:** Windows'un işletim sistemi seviyesindeki görev çubuğunu ve hover menülerini (tooltip) aşarak her şeyin rengini alabilmesi için özel native window hack'leri içerir.
- **Odak Modu:** Ayarlar menüsü açıldığında tüm masaüstünü hafifçe karartarak arkadaki uygulamalarla etkileşimi kilitler ve sadece ayarlar widget'ına odaklanmanızı sağlar.
- **Minimalist Ayarlar:** Çerçevesiz, şık bir arayüz ile global kısayolu kolayca değiştirebilirsiniz (Örn: `Ctrl+Shift+H` veya `Ctrl+Alt+Shift+H` gibi kombinasyonları destekler).
- **Anında Kopyalama:** Tıkladığınız noktanın HEX kodunu hiçbir bildirim çıkarmadan saniyesinde panoya kopyalar.

## Kurulum ve Kullanım
```bash
# Bağımlılıkları yükleyin
npm install

# Uygulamayı başlatın
npm start
```
Varsayılan kısayol `Ctrl+Shift+H` olarak ayarlıdır. Sistem tepsisindeki (sağ alt) ikona sağ tıklayıp "Ayarlar" sekmesinden bunu dilediğiniz gibi değiştirebilirsiniz.
