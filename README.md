# ANIDESK (Windows x64)

> **ANIDESK** is a flagship anime streaming & social desktop client reverse-engineered from the **AniFam Mobile** Android app (`net.anifam.app` v0.1.2). Rebuilt from the ground up with **Electron 34**, **React 19**, **TypeScript**, **Tailwind CSS**, and **HLS.js**.

---

## ⚡ What's New in ANIDESK v1.0 Pro

### 1. 🎨 Video & Resolution Enhancer Engine (Fixes Dull Colors)
- **Automatic 1080p Stream Initialization**: Overrides initial blurry 360p adaptive buffering by automatically locking onto the highest available resolution level upon manifest load.
- **Hardware-Accelerated Post-Processing Shaders**:
  - **✨ Vivid Anime Mode (Default)**: `contrast(1.10) saturate(1.22) brightness(1.03)` — deep inky blacks, vibrant anime colors, and razor-sharp line art.
  - **🎬 Cinema HDR Sim**: `contrast(1.15) saturate(1.10) brightness(0.98)` — deep theater contrast.
  - **🔥 Ultra Crisp**: `contrast(1.08) brightness(1.04) saturate(1.06)` — high-frequency detail clarity.
  - **⚡ OLED Boost**: `contrast(1.18) saturate(1.28) brightness(1.01)` — extreme saturation.
  - **⚪ Original**: Raw unenhanced stream.
- **Instant Hotkey**: Press <kbd>E</kbd> in the player to cycle through visual enhancer modes with on-screen HUD toast.

### 2. 🎮 Interactive Player HUD & Touch/Mouse Gestures
- **On-Screen Animated HUD**: Floating center pill showing volume percentage (<kbd>↑</kbd>/<kbd>↓</kbd>), seek timestamps (<kbd>←</kbd>/<kbd>→</kbd>), audio tracks, and server changes.
- **Double-Tap / Double-Click Gestures**:
  - Double-click **Left 35%**: Seek **-10s** with animated ripple.
  - Double-click **Right 35%**: Seek **+10s** with animated ripple.
  - Double-click **Center**: Toggle **Fullscreen**.
- **Double-Click TitleBar**: Maximize / Restore window anywhere along the header.

### 3. 🎯 Seamless Playback Continuity & Bug Fixes
- **Timestamp Preservation**: Switching between Sub & Dub or changing stream servers retains your exact second position without restarting the episode.
- **Intelligent Skip Intro / Outro**: Single-fire auto-skip protection so you can seek back and re-listen to your favorite anime openings without being forced forward.
- **Watched Episode History**: Watched episodes display a crisp green checkmark in the episode selector.
- **Dynamic Resume Button**: Detail pages show `Resume EP X` matching your exact progress instead of always starting at Episode 1.
- **Debounced Search**: Browse page and `Ctrl + K` search bar feature debouncing to eliminate race conditions and lag.
- **Recent Searches**: `Ctrl + K` search modal saves recent searches and presents popular anime quick-jump pills.

---

## ⌨️ Global Player Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> / <kbd>K</kbd> | Play / Pause |
| <kbd>→</kbd> / <kbd>←</kbd> | Seek forward / backward 10 seconds |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume up / down (with on-screen HUD) |
| <kbd>M</kbd> | Toggle Mute |
| <kbd>F</kbd> | Toggle Fullscreen |
| <kbd>E</kbd> | Cycle Video Color & Resolution Enhancer |
| <kbd>N</kbd> / <kbd>P</kbd> | Next / Previous Episode |
| <kbd>Esc</kbd> | Exit Fullscreen / Close Player / Close Modals |
| <kbd>Ctrl + K</kbd> | Open Instant Search Modal |

---

## 🚀 How to Run

### Run Standalone Desktop App
```bash
cd E:\anifam-desktop
npx electron .
```

### Run with Hot-Reload Development Server
```bash
cd E:\anifam-desktop
npm run dev
```

### Build Production Windows Installer (.exe)
```bash
cd E:\anifam-desktop
npm run dist
```
Output directory: `E:\anifam-desktop\release/`
