// content.js (Numpad Control Integration - Uses chrome.storage.local)

console.log("[Content_YT_Sampler] Script Injected. Numpad Control Active.");

const settingsStorageKey = 'youtubeSampler_currentSet'; // Key for local storage
let customTimestamps = {}; // Stores timestamps for the SELECTED bank
let extensionIsEnabled = true; // Global enable state
let loadedSelectedBank = 'A'; // Track which bank's data is loaded

// --- Helper: Read latest settings from storage ---
async function getLatestSettings() {
    try {
        const result = await chrome.storage.local.get([settingsStorageKey]);
        const settings = result[settingsStorageKey] || {};
        // Ensure basic structure exists
        settings.isEnabled = (typeof settings.isEnabled === 'boolean') ? settings.isEnabled : true;
        settings.selectedBank = settings.selectedBank || 'A';
        settings.banks = settings.banks || {};
        // Ensure all banks exist within the banks object
        const bankIds = ['A', 'B', 'C', 'D'];
        bankIds.forEach(id => {
            settings.banks[id] = settings.banks[id] || { timestamps: {}, mode: 'trigger' }; // Use default if bank missing
             settings.banks[id].timestamps = settings.banks[id].timestamps || {}; // Ensure timestamps obj exists
        });
        return settings;
    } catch (error) {
        console.error("[Content_YT_Sampler] Error reading settings:", error);
        return null;
    }
}

// --- Helper: Save updated settings object ---
async function saveUpdatedSettings(settings) {
    try {
        await chrome.storage.local.set({ [settingsStorageKey]: settings });
        console.log("[Content_YT_Sampler] Settings updated in storage.");
        // onChanged listener below will handle reloading data in this script
    } catch (error) {
        console.error("[Content_YT_Sampler] Error saving updated settings:", error);
    }
}

// --- Function to SET timestamp via Ctrl+Numpad Key ---
async function setTimestampForKey(keyNumberString, time) {
    console.log(`[Content_YT_Sampler] Attempting to SET timestamp for key '${keyNumberString}' to ${time}`);
    const settings = await getLatestSettings();
    if (!settings) return;
    const bankId = settings.selectedBank;
    // Structure ensured by getLatestSettings
    settings.banks[bankId].timestamps[keyNumberString] = parseFloat(time.toFixed(2));
    await saveUpdatedSettings(settings);
    // Add visual feedback here? e.g. showStatusMessage(`Set Key ${keyNumberString} (Bank ${bankId})`);
}

// --- Function to Cycle Banks via Numpad / or * ---
async function cycleBank(goUp = true) {
    console.log(`[Content_YT_Sampler] Attempting to cycle bank ${goUp ? 'UP' : 'DOWN'}`);
    const settings = await getLatestSettings();
    if (!settings) return;

    const bankIds = ['A', 'B', 'C', 'D'];
    let currentIndex = bankIds.indexOf(settings.selectedBank);
    if (currentIndex === -1) currentIndex = 0; // Default to A if error

    let nextIndex;
    if (goUp) {
        nextIndex = (currentIndex + 1) % bankIds.length; // Cycle A->B->C->D->A
    } else {
        nextIndex = (currentIndex - 1 + bankIds.length) % bankIds.length; // Cycle A->D->C->B->A
    }
    const nextBankId = bankIds[nextIndex];
    settings.selectedBank = nextBankId;
    console.log(`[Content_YT_Sampler] Cycling bank to: ${nextBankId}`);
    await saveUpdatedSettings(settings);
     // Add visual feedback here? e.g. showStatusMessage(`Selected Bank ${nextBankId}`);
}

// --- Function to Toggle Enable/Disable via Numpad Decimal ---
async function toggleExtensionEnabled() {
     console.log(`[Content_YT_Sampler] Attempting to toggle enable state...`);
     const settings = await getLatestSettings();
     if (!settings) return;
     settings.isEnabled = !settings.isEnabled; // Flip the boolean
     console.log(`[Content_YT_Sampler] Setting isEnabled to: ${settings.isEnabled}`);
     await saveUpdatedSettings(settings);
      // Add visual feedback here? e.g. showStatusMessage(`Extension ${settings.isEnabled ? 'Enabled' : 'Disabled'}`);
}

// --- Load settings from LOCAL storage ---
function loadActiveBankData() {
    console.log("[Content_YT_Sampler] === loadActiveBankData START (local) ===");
    chrome.storage.local.get([settingsStorageKey], (result) => { /* ... same logic as previous version ... */
        let useTimestamps = {};
        let useIsEnabled = true;
        let useSelectedBank = 'A';
        if (chrome.runtime.lastError) { /* ... error handling ... */ }
        else {
            const loadedSettings = result[settingsStorageKey];
            console.log("[Content_YT_Sampler] loadActiveBankData: Raw settings loaded:", loadedSettings);
            if (loadedSettings && typeof loadedSettings.banks === 'object' && typeof loadedSettings.selectedBank === 'string') {
                 useIsEnabled = (typeof loadedSettings.isEnabled === 'boolean') ? loadedSettings.isEnabled : true;
                 useSelectedBank = loadedSettings.selectedBank || 'A';
                 const banksData = loadedSettings.banks || {};
                 const selectedBankData = banksData[useSelectedBank] || {};
                 useTimestamps = selectedBankData.timestamps || {};
            } else { /* ... handle old/invalid structure ... */ }
        }
        extensionIsEnabled = useIsEnabled;
        loadedSelectedBank = useSelectedBank;
        customTimestamps = useTimestamps;
        console.log(`[Content_YT_Sampler] loadActiveBankData: === FINAL STATE ===> Enabled: ${extensionIsEnabled}, Selected Bank: ${loadedSelectedBank}, Timestamps:`, customTimestamps);
    });
}

// Load initially
loadActiveBankData();

// --- Listen for changes in LOCAL storage ---
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[settingsStorageKey]) { // Using local
        console.log("[Content_YT_Sampler] Detected change in settings key (local). Reloading active bank data...");
        loadActiveBankData();
    }
});

// --- Main KeyDown Listener (Using event.code for Numpad) ---
document.addEventListener('keydown', async (event) => {
    const code = event.code; // Use physical key code
    // console.log(`[Content_YT_Sampler] Keydown: Code='${code}', Key='${event.key}', Enabled=${extensionIsEnabled}, Bank='${loadedSelectedBank}'`); // Verbose log if needed

    // Ignore if typing in input fields
    const targetElement = event.target;
    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) {
        return;
    }

    // --- Check if Extension is Globally Enabled FIRST ---
    // Allow Bank Switching and Enable Toggle even if cues are disabled
    if (!extensionIsEnabled && !["NumpadDivide", "NumpadMultiply", "NumpadDecimal"].includes(code)) {
        // If disabled, only allow bank switching or re-enabling via NumpadDecimal
        return;
    }

    let videoPlayer; // Declare video player variable

    // --- Handle Numpad Actions using event.code ---
    switch (code) {
        // --- Cue Triggers (1-9) ---
        case "Numpad1":
        case "Numpad2":
        case "Numpad3":
        case "Numpad4":
        case "Numpad5":
        case "Numpad6":
        case "Numpad7":
        case "Numpad8":
        case "Numpad9":
            if (!extensionIsEnabled) break; // Don't trigger cues if disabled
            const keyNumber = code.slice(-1); // Get the '1' from 'Numpad1' etc.
            const targetTime = customTimestamps[keyNumber];
            console.log(`[Content_YT_Sampler] Numpad ${keyNumber} pressed. Timestamp lookup in bank '${loadedSelectedBank}':`, targetTime);
            if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
                videoPlayer = document.querySelector('video.html5-main-video');
                if (videoPlayer) {
                    console.log(`[Content_YT_Sampler] Action: Numpad ${keyNumber} (Bank ${loadedSelectedBank}) -> ${targetTime}s`);
                    event.preventDefault(); event.stopPropagation();
                    videoPlayer.currentTime = parseFloat(targetTime);
                    videoPlayer.play();
                } else { console.warn(`[Content_YT_Sampler] Numpad ${keyNumber}: Video player not found!`); }
            }
            break; // Exit switch after handling

        // --- Pause & Reset (0) ---
        case "Numpad0":
             if (!extensionIsEnabled) break; // Don't trigger if disabled
             videoPlayer = document.querySelector('video.html5-main-video');
             if (videoPlayer) {
                  console.log("[Content_YT_Sampler] Action: Numpad 0 -> Pause & Reset to 0s");
                  event.preventDefault(); event.stopPropagation();
                  videoPlayer.pause();
                  videoPlayer.currentTime = 0;
             } else { console.warn("[Content_YT_Sampler] Numpad 0: Video player not found!"); }
             break;

        // --- Bank Down (/) ---
        case "NumpadDivide":
             console.log("[Content_YT_Sampler] Action: Numpad / -> Cycle Bank Down");
             event.preventDefault(); event.stopPropagation();
             cycleBank(false); // Call async function (don't await)
             break;

        // --- Bank Up (*) ---
        case "NumpadMultiply":
             console.log("[Content_YT_Sampler] Action: Numpad * -> Cycle Bank Up");
             event.preventDefault(); event.stopPropagation();
             cycleBank(true); // Call async function (don't await)
             break;

        // --- Decrease Rate (-) ---
        case "NumpadSubtract":
            if (!extensionIsEnabled) break; // Don't control rate if disabled
            videoPlayer = document.querySelector('video.html5-main-video');
            if (videoPlayer) {
                event.preventDefault(); event.stopPropagation();
                const currentRate = videoPlayer.playbackRate;
                const newRate = Math.max(0.1, currentRate - 0.1); // Min rate 0.1x
                videoPlayer.playbackRate = newRate;
                console.log(`[Content_YT_Sampler] Action: Numpad - -> Playback Rate: ${newRate.toFixed(2)}x`);
            } else { console.warn("[Content_YT_Sampler] Numpad -: Video player not found!"); }
            break;

        // --- Increase Rate (+) ---
        case "NumpadAdd":
             if (!extensionIsEnabled) break; // Don't control rate if disabled
             videoPlayer = document.querySelector('video.html5-main-video');
             if (videoPlayer) {
                event.preventDefault(); event.stopPropagation();
                const currentRate = videoPlayer.playbackRate;
                const newRate = Math.min(4.0, currentRate + 0.1); // Max rate 4x
                videoPlayer.playbackRate = newRate;
                console.log(`[Content_YT_Sampler] Action: Numpad + -> Playback Rate: ${newRate.toFixed(2)}x`);
             } else { console.warn("[Content_YT_Sampler] Numpad +: Video player not found!"); }
             break;

        // --- Toggle Enable/Disable (.) ---
        case "NumpadDecimal":
             console.log("[Content_YT_Sampler] Action: Numpad . -> Toggle Enable/Disable");
             event.preventDefault(); event.stopPropagation();
             toggleExtensionEnabled(); // Call async function (don't await)
             break;

        // --- Toggle Play/Pause (Enter) ---
        case "NumpadEnter":
             // Allow Play/Pause even if extension cues are disabled? Yes, seems reasonable.
             videoPlayer = document.querySelector('video.html5-main-video');
             if (videoPlayer) {
                  event.preventDefault(); event.stopPropagation();
                  if (videoPlayer.paused) {
                      console.log("[Content_YT_Sampler] Action: Numpad Enter -> Play");
                      videoPlayer.play();
                  } else {
                      console.log("[Content_YT_Sampler] Action: Numpad Enter -> Pause");
                      videoPlayer.pause();
                  }
             } else { console.warn("[Content_YT_Sampler] Numpad Enter: Video player not found!"); }
             break;

        // --- Ctrl + Numpad (Set Timestamp) ---
        // Need to check modifiers *inside* the relevant numpad case if needed,
        // but we moved Set to Ctrl+Number on main keyboard previously.
        // Let's stick to the current plan: ONLY Numpad keys for these actions.

        // Default: Ignore other keys handled by this listener
    }

    // --- Modifier key SET action (Ctrl + MAIN Keyboard Number) ---
    // Keep the previously added logic for Ctrl + Top Row Number Keys to SET cues
    if (key >= '0' && key <= '9' && event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
        // Ensure this doesn't run if Numpad was already handled (it shouldn't if event.code was numpad)
        if (!code.startsWith("Numpad")) {
             console.log(`[Content_YT_Sampler] Ctrl+${key} (Main Keyboard) detected. Attempting to SET timestamp...`);
             event.preventDefault(); // Prevent any default Ctrl+Number action
             event.stopPropagation();
             videoPlayer = document.querySelector('video.html5-main-video');
             if (videoPlayer) {
                 const currentTime = videoPlayer.currentTime;
                 setTimestampForKey(key, currentTime); // Use the MAIN keyboard number ('0'-'9') as the key
             } else {
                  console.warn("[Content_YT_Sampler] Ctrl+Key: Video player not found.");
             }
        }
    }


}, true); // Use capture phase
