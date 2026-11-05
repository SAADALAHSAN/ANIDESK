<div align="center">

# ⚡ ANIDESK

### Next-Gen Anime Streaming & Desktop Client for Windows
[![Release](https://img.shields.io/github/v/release/SAADALAHSAN/ANIDESK?style=for-the-badge&color=10b981&label=Latest%20Version)](https://github.com/SAADALAHSAN/ANIDESK/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078d7?style=for-the-badge&logo=windows)](https://github.com/SAADALAHSAN/ANIDESK/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/SAADALAHSAN/ANIDESK/total?style=for-the-badge&color=8b5cf6)](https://github.com/SAADALAHSAN/ANIDESK/releases/latest)
[![License](https://img.shields.io/badge/License-MIT-red?style=for-the-badge)](LICENSE)

<br/>

### 📥 [DOWNLOAD FOR WINDOWS (CLICK HERE)]

| Edition | Type | Direct Download Link | Description |
| :--- | :--- | :--- | :--- |
| **Installer (Recommended)** | `.exe` | [**⬇️ Download ANIDESK Setup (v1.2.0)**](https://github.com/SAADALAHSAN/ANIDESK/releases/download/v1.2.0/ANIDESK-Setup-1.2.0.exe) | Standard installer. Creates Desktop shortcut, Start Menu entry, and enables background auto-updates. |
| **Portable Edition** | `.exe` | [**⬇️ Download Portable Edition (v1.2.0)**](https://github.com/SAADALAHSAN/ANIDESK/releases/download/v1.2.0/ANIDESK-Portable-1.2.0.exe) | Single standalone executable. Run anywhere without installing (great for USB drives). |

---

</div>

## 🌟 Key Highlights & Engineering Features

### 🎬 1. True 1080p Ultra HD Video Engine (5.5 Mbps)
* **High-Bitrate CDN Auto-Lock**: Automatically locks onto high-fidelity **5.5 Mbps HLS streams (MovieBox / TikTok CDN)** instead of blurry 1.8 Mbps default mirrors.
* **Direct GPU Hardware DirectComposition**: Native Chromium DirectComposition overlay bypassing destructive 3D CSS matrix downscaling on Windows display scaling (125%/150%).
* **Visual Post-Processing Modes**:
  - `Native Pure (Default)`: 1:1 raw studio output with zero filter overhead.
  - `Ultra Crisp`: High-pass edge clarity for line art.
  - `Vivid Anime`: Rich contrast and dynamic color balancing.
  - `Cinema Mode`: Deep shadow detail.
  - `OLED Boost`: High-saturation color tuning.

### 🔄 2. Multi-Mirror Zero-Buffer Failover
* **Proactive Mirror Health Engine**: Probes and health-checks 6+ streaming mirrors in real time.
* **Smart Auto-Failover**: If a server experiences buffering or network timeouts, the player instantly shifts to backup mirrors without kicking the user out.

### ⚡ 3. Intelligent Playback Experience
* **Automated Intro/Outro Skip**: Single-fire OP/ED skip protection.
* **Seamless Audio & Server Switching**: Exact timestamp preservation when toggling between **SUB** and **DUB** tracks or changing streaming servers.
* **Background HLS Downloader**: Download entire episodes with subtitles in the background for offline viewing.

### 🚀 4. Automated In-App Updates
* **Silent Update Checker**: Background auto-detection of new releases directly from GitHub.
* **One-Click Update**: Users receive an instant in-app update prompt whenever a new version is published.

---

## 🛠️ Tech Stack

* **Core Runtime**: [Electron 34](https://www.electronjs.org/)
* **UI Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) + Custom Glassmorphism
* **Streaming Engine**: [HLS.js](https://github.com/video-dev/hls.js/) + Native DirectComposition
* **Build Tooling**: [Vite 6](https://vitejs.dev/) + [electron-builder](https://www.electron.build/)

---

## 💻 Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/SAADALAHSAN/ANIDESK.git
cd ANIDESK

# 2. Install dependencies
npm ci

# 3. Start development server with Electron hot reload
npm run desktop

# 4. Build and package Windows executables
npm run pack
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
