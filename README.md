# YouTube MPC

![](https://img.shields.io/badge/JavaScript-62.2%25-F7DF1E?logo=javascript&logoColor=black)
![](https://img.shields.io/badge/HTML-19.0%25-E34F26?logo=html5&logoColor=white)
![](https://img.shields.io/badge/CSS-18.8%25-1572B6?logo=css3&logoColor=white)
![](https://img.shields.io/badge/License-MIT-yellow.svg) 
> Turn YouTube videos into a playable sampler instrument using your numpad!

## Demo / Screenshots

*Visuals coming soon!*

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

## Features

-   **Instant Numpad Triggering:** Play assigned YouTube timestamps instantly with Numpad 1-9.
-   **On-the-Fly Cue Capture:** While watching YouTube, press `Ctrl + Numpad (1-9)` to map the current moment to a pad.
-   **Performance Banks:** Organize samples across four banks (A, B, C, D). Switch using Numpad `/`, `*`, `-`, `+`.
-   **Expressive Playback Modes:** Choose "1-Shot" (trigger and play) or "Hold" (play only while held down) per bank. Toggle with `Ctrl + Numpad .`.
-   **MPC-Style Control Panel:** Click the extension icon for an interface to manage cues, fine-tune timings (`.00` precision), rename banks, set modes, and more.
-   **Save/Load Banks:** Save your bank configurations (`.json` files) and load them back anytime. Build your sample kit library!
-   **Quick On/Off Toggle:** Enable/disable numpad control instantly with Numpad `.` (Decimal).
-   **Stop Control:** Use `Numpad 0` to stop playback.

## Installation

There are a two ways to install YouTube MPC:

1.  **Chrome Web Store (Recommended):**
    * Install directly from the official store for automatic updates.
    * **[Link Coming Soon!]**

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
5.  Need to fine-tune? Click the YouTube MPC icon to open the control panel. Here you can manually edit timestamps with two-decimal (`.00`) precision, rename banks, switch playback modes, and Save/Load your banks. (Remember, keyboard shortcuts only work when the YouTube page/tab itself is active, not when the popup panel is focused).

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
