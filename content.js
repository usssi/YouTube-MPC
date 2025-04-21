let videoPlayer = null;
let lastActiveElement = null;
let settings = null;
let currentPlaybackMode = '1shot';
let loadedSelectedBank = 'A';
let isEnabled = true;
let lastSeekTimestamp = null;
const seekDebounceTime = 150;

const settingsStorageKey = 'youtubeSampler_currentSet';

function findVideoPlayer() {
    videoPlayer = document.querySelector('.html5-main-video');
    return videoPlayer;
}

function getDefaultPadNames() {
    const names = {};
    for (let i = 1; i <= 9; i++) {
        names[i.toString()] = `PAD ${i}`;
    }
    return names;
}

function getDefaultBankData() {
    const timestamps = {};
    for (let i = 1; i <= 9; i++) { timestamps[i.toString()] = null; }
    return {
        timestamps: timestamps,
        mode: '1shot',
        name: null,
        padNames: getDefaultPadNames()
    };
}

function sanitizeSettings(loadedSettings) {
    const sanitized = loadedSettings || { isEnabled: true, selectedBank: 'A', banks: {} };
    sanitized.isEnabled = (typeof sanitized.isEnabled === 'boolean') ? sanitized.isEnabled : true;
    sanitized.selectedBank = ['A', 'B', 'C', 'D'].includes(sanitized.selectedBank) ? sanitized.selectedBank : 'A';
    sanitized.banks = sanitized.banks || {};
     const defaultPadNames = getDefaultPadNames();

    ['A', 'B', 'C', 'D'].forEach(bankId => {
        if (!sanitized.banks[bankId]) {
            sanitized.banks[bankId] = getDefaultBankData();
        } else {
            sanitized.banks[bankId].timestamps = sanitized.banks[bankId].timestamps || getDefaultBankData().timestamps;
            sanitized.banks[bankId].mode = ['1shot', 'hold'].includes(sanitized.banks[bankId].mode) ? sanitized.banks[bankId].mode : '1shot';
             sanitized.banks[bankId].padNames = sanitized.banks[bankId].padNames || defaultPadNames; // Ensure padNames object exists

            const currentTimestamps = sanitized.banks[bankId].timestamps;
            const finalTimestamps = {};
            for (let i = 1; i <= 9; i++) {
                const key = i.toString();
                const value = currentTimestamps ? currentTimestamps[key] : null;
                 if (value !== null && value !== undefined && !isNaN(parseFloat(value)) && parseFloat(value) >= 0) {
                     finalTimestamps[key] = parseFloat(parseFloat(value).toFixed(2));
                 } else {
                     finalTimestamps[key] = null;
                 }
            }
            sanitized.banks[bankId].timestamps = finalTimestamps;

             const currentPadNames = sanitized.banks[bankId].padNames;
             const finalPadNames = {};
             for (let i = 1; i <= 9; i++) {
                 const key = i.toString();
                 const name = currentPadNames ? String(currentPadNames[key] || '').trim() : '';
                 finalPadNames[key] = name || defaultPadNames[key]; // Use default if empty
             }
             sanitized.banks[bankId].padNames = finalPadNames;
        }
    });
    return sanitized;
}


function loadSettings() {
    chrome.storage.local.get([settingsStorageKey], (result) => {
        if (chrome.runtime.lastError) {
            console.error("YT MPC Error loading settings:", chrome.runtime.lastError);
            settings = sanitizeSettings(null); // Use defaults on error
        } else {
            settings = sanitizeSettings(result[settingsStorageKey]);
        }
        isEnabled = settings.isEnabled;
        loadedSelectedBank = settings.selectedBank;
        currentPlaybackMode = settings.banks?.[loadedSelectedBank]?.mode || '1shot';
        console.log(`[YT MPC Content] Settings loaded. Enabled: ${isEnabled}, Bank: ${loadedSelectedBank}, Mode: ${currentPlaybackMode}`);
        updateIcon();
    });
}

function updateIcon() {
    let iconType = 'off';
    if (isEnabled) {
        iconType = currentPlaybackMode === 'hold' ? 'hold' : 'on';
    }
    chrome.runtime.sendMessage({ action: "changeIcon", icon: iconType });
}


function handleKeyDown(event) {
    if (!videoPlayer || !isEnabled) return;
    if (!settings || !settings.banks) {
        console.warn("[YT MPC Content] Settings not loaded yet, key ignored.");
        return;
    }

    const code = event.code;
    const isNumpadDigit = code.startsWith("Numpad") && code.length === 7 && /\d/.test(code[6]);
    const isNumpadControl = ["Numpad0", "NumpadDecimal", "NumpadDivide", "NumpadMultiply", "NumpadSubtract", "NumpadAdd"].includes(code);

    if (!isNumpadDigit && !isNumpadControl) return;

    lastActiveElement = document.activeElement;
     // Prevent most default actions if a relevant key is pressed and extension is active
     // Exception: Allow default '.' action if Ctrl not pressed

    const padKey = isNumpadDigit ? code[6] : null; // 1-9
    const currentBankData = settings.banks[loadedSelectedBank];
    const targetT = (padKey && currentBankData?.timestamps) ? currentBankData.timestamps[padKey] : null;

    // --- Handle Ctrl + Numpad (Set Cue) ---
    if (event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && isNumpadDigit) {
        event.preventDefault();
        event.stopPropagation();
        const currentTime = videoPlayer.currentTime;
        console.log(`[YT MPC Content] Ctrl+Numpad${padKey} detected. Setting cue to: ${currentTime}`);
        chrome.runtime.sendMessage({ action: 'setTimestamp', key: padKey, value: currentTime });
        chrome.runtime.sendMessage({ action: "changeIcon", icon: "recording" }); // Visual feedback
        return; // Stop further processing
    }

    // --- Handle Alt + Numpad (Clear Cue) --- NEW SECTION ---
     else if (event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey && isNumpadDigit) {
         event.preventDefault();
         event.stopPropagation();
         console.log(`[YT MPC Content] Alt+Numpad${padKey} detected. Requesting clear.`);
         chrome.runtime.sendMessage({ action: 'clearPadData', key: padKey });
         // Optional feedback (e.g., icon change handled by background on successful clear)
         return; // Stop further processing
    }

    // --- Handle Numpad Playback / Controls (No Ctrl/Alt/Shift/Meta) ---
    else if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
        if (isNumpadDigit) { // Numpad 1-9
            event.preventDefault();
            event.stopPropagation();
            if (targetT !== undefined && targetT !== null && !isNaN(targetT)) {
                 const now = Date.now();
                 // Debounce seeks very close together
                 if (lastSeekTimestamp && (now - lastSeekTimestamp < seekDebounceTime)) {
                      console.log("[YT MPC Content] Seek debounced");
                      return;
                 }
                 lastSeekTimestamp = now;

                 videoPlayer.currentTime = targetT;
                 videoPlayer.play();
                 console.log(`[YT MPC Content] Numpad ${padKey}: Playing cue at ${targetT}s (Mode: ${currentPlaybackMode})`);
                 chrome.runtime.sendMessage({ action: "changeIcon", icon: "playing" }); // Send message for icon change
                 if(currentPlaybackMode === '1shot') {
                    chrome.runtime.sendMessage({ action: 'padTriggered', key: padKey, mode: '1shot' });
                 } else { // hold mode
                     chrome.runtime.sendMessage({ action: 'padHoldStart', key: padKey });
                 }
            } else {
                console.log(`[YT MPC Content] Numpad ${padKey}: No cue assigned.`);
                 // No action if no cue assigned (prevents default YouTube jump)
            }
        } else if (code === "Numpad0") { // Numpad 0 (Stop)
            event.preventDefault();
            event.stopPropagation();
            videoPlayer.pause();
             // Optionally reset time to 0? Or just pause? Let's just pause.
             // videoPlayer.currentTime = 0;
            console.log("[YT MPC Content] Numpad 0: Playback stopped.");
             chrome.runtime.sendMessage({ action: 'padHoldEndAll' }); // Signal end of any potential holds
             chrome.runtime.sendMessage({ action: 'stopPadTriggered' }); // For UI flash
             updateIcon(); // Reset icon to default state
        } else if (code === "NumpadDecimal") { // Numpad . (Toggle Enable)
             event.preventDefault();
             event.stopPropagation();
             chrome.runtime.sendMessage({ action: 'toggleEnable' });
             // isEnabled state will be updated via storage listener
        } else if (["NumpadDivide", "NumpadMultiply", "NumpadSubtract", "NumpadAdd"].includes(code)) { // Bank Change
            event.preventDefault();
            event.stopPropagation();
             let bank;
             if(code === "NumpadDivide") bank = 'A';
             else if(code === "NumpadMultiply") bank = 'B';
             else if(code === "NumpadSubtract") bank = 'C';
             else if(code === "NumpadAdd") bank = 'D';
             if (bank) {
                 console.log(`[YT MPC Content] Bank change key detected: ${bank}`);
                 chrome.runtime.sendMessage({ action: 'changeBank', targetBank: bank });
                 // selectedBank and mode will be updated via storage listener
             }
        }
    }

     // --- Handle Ctrl + Numpad Decimal (Toggle Mode) ---
     else if (event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && code === "NumpadDecimal") {
         event.preventDefault();
         event.stopPropagation();
         console.log("[YT MPC Content] Ctrl+Numpad . detected. Toggling mode.");
         chrome.runtime.sendMessage({ action: 'toggleMode' });
         // Mode will be updated via storage listener
     }

}

function handleKeyUp(event) {
    if (!videoPlayer || !isEnabled) return;
     if (!settings || !settings.banks) return;

    const code = event.code;
     const isNumpadDigit = code.startsWith("Numpad") && code.length === 7 && /\d/.test(code[6]);

     // Only act if it's Hold mode and a numpad digit was released without modifiers
     if (currentPlaybackMode === 'hold' && isNumpadDigit &&
         !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey)
     {
         const padKey = code[6];
         videoPlayer.pause(); // Stop playback on key up in hold mode
         console.log(`[YT MPC Content] Numpad ${padKey} (Hold): Key up, pausing.`);
         chrome.runtime.sendMessage({ action: 'padHoldEnd', key: padKey });
         updateIcon(); // Reset icon
     }
}

// --- Initialization and Listeners ---

if (findVideoPlayer()) {
    console.log("[YT MPC Content] Player found on initial load.");
    loadSettings(); // Load settings initially
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('keyup', handleKeyUp, true); // Use capture phase
} else {
    console.log("[YT MPC Content] Player not found initially, will use observer.");
    // If player isn't immediately available (e.g., navigating within YT), observe changes
    const observer = new MutationObserver((mutations) => {
        if (findVideoPlayer()) {
            console.log("[YT MPC Content] Player found via MutationObserver.");
            loadSettings();
            document.addEventListener('keydown', handleKeyDown, true);
            document.addEventListener('keyup', handleKeyUp, true);
            observer.disconnect(); // Stop observing once found
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// Listen for changes from storage (e.g., options page)
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[settingsStorageKey]) {
        console.log("[YT MPC Content] Settings changed in storage, reloading.");
        const newSettings = sanitizeSettings(changes[settingsStorageKey].newValue);
         const oldIsEnabled = isEnabled;
         const oldBank = loadedSelectedBank;
         const oldMode = currentPlaybackMode;

        settings = newSettings;
        isEnabled = settings.isEnabled;
        loadedSelectedBank = settings.selectedBank;
        currentPlaybackMode = settings.banks?.[loadedSelectedBank]?.mode || '1shot';

         if (oldIsEnabled !== isEnabled || oldBank !== loadedSelectedBank || oldMode !== currentPlaybackMode) {
            console.log(`[YT MPC Content] Reloaded - Enabled: ${isEnabled}, Bank: ${loadedSelectedBank}, Mode: ${currentPlaybackMode}`);
             updateIcon(); // Update icon if relevant state changed
         }
    }
});

// Listen for messages (e.g., from background asking for status)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "queryStatus") {
    sendResponse({
        hasPlayer: !!videoPlayer,
        isEnabled: isEnabled,
        selectedBank: loadedSelectedBank,
        currentMode: currentPlaybackMode
    });
  }
  // Add other message handlers if needed
});
