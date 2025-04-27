# YouTube MPC

![](https://img.shields.io/badge/JavaScript-62.7%25-F7DF1E?logo=javascript&logoColor=black)
![](https://img.shields.io/badge/HTML-18.4%25-E34F26?logo=html5&logoColor=white)
![](https://img.shields.io/badge/CSS-18.9%25-1572B6?logo=css3&logoColor=white)
![](https://img.shields.io/badge/License-MIT-yellow.svg) 
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/hlkhijejilomoffjmjbipnbkadjjikko?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/numpad-cues-for-youtube/hlkhijejilomoffjmjbipnbkadjjikko?hl=en-GB&authuser=0)
> Turn YouTube videos into a playable sampler instrument using your numpad!

## Demo / Screenshots

<p align="center">
  <img src="https://lh3.googleusercontent.com/IloCvQRCwsw-oaqQHixI7gXTrP2syApps2oEJEhnr3z-DaDlbVpXrHx5AG0lTxuPcdRP9CXVUdAqmI0hK7cPCwuMsP8=s1280-w1280-h800" alt="Screenshot/Demo 1" width="250"/>
  &nbsp;&nbsp; <img src="https://lh3.googleusercontent.com/oeEIBGrHLEIbfWiMdD6LZKTuqKD6rKn3zljMrFPWxYnYYPpRuvou75qTV14kYB9op1rrO1p3W--oTF0As-pPWoPkXZQ=s1280-w1280-h800" alt="Screenshot/Demo 2" width="250"/>
</p>

---

**Table of Contents**
- [About YouTube MPC](#about-youtube-mpc)
  - [Features](#features)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Demo Banks](#demo-banks)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [License](#license)
- [Contact](#contact)

---

## About YouTube MPC

**YouTube MPC** is a Chrome Extension that transforms your numpad into an intuitive controller for sampling YouTube videos. Inspired by classic MPC workflows, it lets you instantly perform with video cues as if they were samples. Open any YouTube video and start creating!

Turn any YouTube video into a playable source. Map precise moments to your numpad keys (1-9) and trigger them instantly for live remixing, beat making, sound design, or creative analysis.

* **[View on Chrome Web Store](https://chromewebstore.google.com/detail/numpad-cues-for-youtube/hlkhijejilomoffjmjbipnbkadjjikko?hl=en-GB&authuser=0)**

## Features

-   **Instant Numpad Triggering:** Play assigned YouTube timestamps instantly with Numpad 1-9.
-   **Stop Control:** Use `Numpad 0` to stop playback.
-   **On-the-Fly Cue Capture:** While watching YouTube, press `Ctrl + Numpad (1-9)` to map the current moment to a pad.
-   **Custom Pad Names:** Assign custom labels to each pad (1-9) for better organization (double-click name to edit).
-   **Performance Banks:** Organize samples across four banks (A, B, C, D). Switch using Numpad `/`, `*`, `-`, `+`.
-   **Save/Load Banks:** Save your bank configurations (`.json` files) and load them back anytime. Build your sample kit library!
-   **Expressive Playback Modes:** Choose "1-Shot" (trigger and play) or "Hold" (play only while held down) per bank. Toggle with `Ctrl + Numpad .`.
-   **MPC-Style Control Panel:** Click the extension icon for an interface to manage cues, fine-tune timings (`.00` precision), rename banks, set modes, and more.
-   **Quick On/Off Toggle:** Enable/disable numpad control instantly with Numpad `.` (Decimal).


## Installation

There are a two ways to install YouTube MPC:

1.  **Chrome Web Store (Recommended):**
    * **[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/numpad-cues-for-youtube/hlkhijejilomoffjmjbipnbkadjjikko?hl=en-GB&authuser=0)**

2.  **From GitHub Releases (`.zip` file):**
    * Go to the [Releases page](https://github.com/usssi/YouTube-MPC/releases).  Download the `.zip` file from the latest release.
    * Unzip the downloaded file into a permanent folder on your computer.
    * Open Chrome and navigate to `chrome://extensions`.
    * Enable "Developer mode" using the toggle in the top-right corner.
    * Click the "Load unpacked" button.
    * Select the folder where you unzipped the files.

## Getting Started
> Check full [Keyboard Shortcuts](#keyboard-shortcuts)

1.  Open any YouTube video page in your browser – this is your sound source!
2.  Ensure the extension is ON (check for the Green or Yellow colored icon in your Chrome toolbar). Select your active Bank using Numpad `/`, `*`, `-`, or `+`, or by clicking the desired bank button (A/B/C/D) in the extension panel (opened via the toolbar icon).
3.  While focused on the YouTube video player, find your sample points and press `Ctrl + Numpad (1-9)` to instantly map/record the current time to that key (while pressing `Ctrl` check for Red colored icon in your Chrome toolbar).
4.  Perform your samples! Press `Numpad (1-9)` anytime while on the YouTube page to trigger playback from your saved cue points. (`Numpad 0` stops playback).
5.  Need to fine-tune? Click the YouTube MPC icon to open the control panel. Here you can: manually edit timestamps (click the time value) with `.00` precision (up to 99999.99s, press Enter or click away to save); **double-click a pad name (e.g., "PAD 1") to assign a custom label**; rename banks (double-click bank button); switch playback modes; and Save/Load your banks. (Remember, keyboard shortcuts work on the YouTube page, not the panel).

## Demo Banks

To help you get started quickly, here are some example bank files (`.json`) you can load using the "Load Bank" button in the extension panel.

* **Demo Bank 1:** `[Link to Demo_Bank_1.json]`
    * Designed for use with YouTube Video: `[Link to specific YouTube Video]`
    * Description: *Briefly describe what kind of samples are in this bank.*
* **Demo Bank 2:** `[Link to Demo_Bank_2.json]`
    * Designed for use with YouTube Video: `[Link to specific YouTube Video]`
    * Description: *Briefly describe what kind of samples are in this bank.*

**Disclaimer:** YouTube contains copyrighted material. Please ensure you respect copyright laws and fair use principles when using YouTube MPC with content you do not own the rights to.

## Keyboard Shortcuts

* `Numpad 1-9`: Trigger cue playback for the corresponding pad in the active bank.
* `Numpad 0`: Stop playback.
* `Ctrl + Numpad 1-9`: Set/Overwrite the cue for the corresponding pad using the current video time.
* `Numpad /`: Select Bank A.
* `Numpad *`: Select Bank B.
* `Numpad -`: Select Bank C.
* `Numpad +`: Select Bank D.
* `Numpad .` (Decimal): Toggle the extension On/Off.
* `Ctrl + Numpad .` (Decimal): Toggle playback mode (One-Shot / Hold) for the active bank.

## Contact

Developed by ussi.
 * Website: [ussi.dev](https://ussi.dev)
 * GitHub: [@usssi](https://github.com/usssi)
 * Support/Feedback: [support@ussi.dev](mailto:support@ussi.dev)

## License

> This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 
