console.log("[Content_YT_Sampler] Script Injected. Bank Aware Loader (Local Storage + Modifiers + Direct Bank Select).");

const settingsStorageKey = 'youtubeSampler_currentSet';
let customTimestamps = {};
let extensionIsEnabled = true;
let loadedSelectedBank = 'A';
let currentPlaybackMode = '1shot';
let heldKeyCode = null;
let heldCueTime = null;

function updateBaseIconState() {
    let newBaseState;
    if (!extensionIsEnabled) {
        newBaseState = 'grey';
    } else {
        if (currentPlaybackMode === 'hold') {
            newBaseState = 'yellow';
        } else {
            newBaseState = 'green';
        }
    }
    console.log(`[Content_YT_Sampler] Requesting background update base state to: ${newBaseState}`);
    chrome.runtime.sendMessage({ baseState: newBaseState }).catch(error => console.log("[Content_YT_Sampler] Error sending base state message:", error));
}

function getDefaultBankData() {
    const timestamps = {};
    for (let i = 1; i <= 9; i++) { timestamps[i.toString()] = null; }
    // Include name property
    return { timestamps: timestamps, mode: '1shot', name: null };
}

// Include sanitize helper here too for consistency
function sanitizeSettings(settings) {
    const sanitized = settings || getDefaultSettings();
    sanitized.isEnabled = (typeof sanitized.isEnabled === 'boolean') ? sanitized.isEnabled : true;
    sanitized.selectedBank = sanitized.selectedBank || 'A';
    sanitized.banks = sanitized.banks || {};
    ['A', 'B', 'C', 'D'].forEach(bankId => {
        if (!sanitized.banks[bankId]) { sanitized.banks[bankId] = getDefaultBankData(); }
        else {
            sanitized.banks[bankId].timestamps = sanitized.banks[bankId].timestamps || getDefaultBankData().timestamps;
            sanitized.banks[bankId].mode = sanitized.banks[bankId].mode || getDefaultBankData().mode;
            // Ensure name exists, default to null if undefined
            sanitized.banks[bankId].name = sanitized.banks[bankId].name !== undefined ? sanitized.banks[bankId].name : null;
            delete sanitized.banks[bankId].timestamps['0'];
        }
    });
    return sanitized;
}


async function getLatestSettings() {
    try {
        const result = await chrome.storage.local.get([settingsStorageKey]);
        // Sanitize ensures the structure is always correct
        const settings = sanitizeSettings(result[settingsStorageKey]);
        return settings;
    } catch (error) {
        console.error("[Content_YT_Sampler] Error reading settings:", error);
        return null;
    }
}

function getDefaultSettings() {
    return {
        isEnabled: true,
        selectedBank: 'A',
        banks: {
            'A': getDefaultBankData(), 'B': getDefaultBankData(),
            'C': getDefaultBankData(), 'D': getDefaultBankData()
        }
    };
}


async function saveUpdatedSettings(settings) {
    try {
        if (!settings) {
            console.error("[Content_YT_Sampler] Attempted to save invalid settings object.");
            return;
        }
        // Sanitize before saving
        const sanitizedSettings = sanitizeSettings(settings);
        await chrome.storage.local.set({ [settingsStorageKey]: sanitizedSettings });
        console.log("[Content_YT_Sampler] Settings updated in storage by content script:", sanitizedSettings);

    } catch (error) {
        console.error("[Content_YT_Sampler] Error saving updated settings:", error);
    }
}

async function setTimestampForKey(keyNumberString, time) {
    console.log(`[Content_YT_Sampler] Attempting to SET timestamp for key '${keyNumberString}' via Ctrl+Key to ${time}`);
    const settings = await getLatestSettings();
    if (!settings) return;
    const bankId = settings.selectedBank;
    // settings object is already sanitized by getLatestSettings
    settings.banks[bankId].timestamps[keyNumberString] = parseFloat(time.toFixed(2));
    await saveUpdatedSettings(settings);
}

async function selectBank(bankId) {
    console.log(`[Content_YT_Sampler] Attempting to select Bank ${bankId}`);
    if (!['A', 'B', 'C', 'D'].includes(bankId)) { return; }
    const settings = await getLatestSettings();
    if (!settings) return;
    if (settings.selectedBank !== bankId) {
        settings.selectedBank = bankId;
        console.log(`[Content_YT_Sampler] Selecting Bank: ${settings.selectedBank}`);
        await saveUpdatedSettings(settings);
    } else { console.log(`[Content_YT_Sampler] Bank ${bankId} is already selected.`); }
}

async function toggleExtensionEnabled() {
    console.log(`[Content_YT_Sampler] Attempting to toggle enable state...`);
    const settings = await getLatestSettings();
    if (!settings) return;
    settings.isEnabled = !settings.isEnabled;
    console.log(`[Content_YT_Sampler] Setting isEnabled to: ${settings.isEnabled}`);
    await saveUpdatedSettings(settings);
}

async function toggleCurrentBankMode() {
    console.log(`[Content_YT_Sampler] Attempting to toggle playback mode...`);
    const settings = await getLatestSettings();
    if (!settings) return;
    const bankId = settings.selectedBank;
    // settings object is already sanitized by getLatestSettings
    const currentMode = settings.banks[bankId].mode || '1shot'; // Default just in case
    const newMode = (currentMode === '1shot') ? 'hold' : '1shot';
    settings.banks[bankId].mode = newMode;
    console.log(`[Content_YT_Sampler] Setting Bank ${bankId} mode to: ${newMode}`);
    await saveUpdatedSettings(settings);
}


function loadActiveBankData() {
    console.log("[Content_YT_Sampler] === loadActiveBankData START (local) ===");
    chrome.storage.local.get([settingsStorageKey], (result) => {
        let useTimestamps = {};
        let useIsEnabled = true;
        let useSelectedBank = 'A';
        let usePlaybackMode = '1shot';

        if (chrome.runtime.lastError) {
            console.error("[Content_YT_Sampler] loadActiveBankData: Error loading settings:", chrome.runtime.lastError);
            const defaultSettings = getDefaultSettings(); // Use defaults on error
            useIsEnabled = defaultSettings.isEnabled;
            useSelectedBank = defaultSettings.selectedBank;
            const defaultBankData = defaultSettings.banks[useSelectedBank] || getDefaultBankData();
            useTimestamps = defaultBankData.timestamps;
            usePlaybackMode = defaultBankData.mode;
        } else {
             // Use sanitize helper to ensure structure and defaults
             const cleanSettings = sanitizeSettings(result[settingsStorageKey]);
             useIsEnabled = cleanSettings.isEnabled;
             useSelectedBank = cleanSettings.selectedBank;
             const selectedBankData = cleanSettings.banks[useSelectedBank]; // Assumed to exist after sanitize
             useTimestamps = selectedBankData.timestamps;
             usePlaybackMode = selectedBankData.mode;
        }

        extensionIsEnabled = useIsEnabled;
        loadedSelectedBank = useSelectedBank;
        customTimestamps = useTimestamps;
        currentPlaybackMode = usePlaybackMode;
        heldKeyCode = null;
        heldCueTime = null;

        console.log(`[Content_YT_Sampler] loadActiveBankData: === FINAL STATE ===> Enabled: ${extensionIsEnabled}, Selected Bank: ${loadedSelectedBank}, Mode: ${currentPlaybackMode}`); // Removed timestamps log for brevity

        updateBaseIconState();
    });
}

loadActiveBankData();

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[settingsStorageKey]) {
        console.log("[Content_YT_Sampler] Detected change in settings key (local). Reloading active bank data...");
        loadActiveBankData();
    }
});

document.addEventListener('keydown', async (event) => {
    if (!event || !event.key || !event.code) { return; }
    const code = event.code; const key = event.key; const targetElement = event.target;
    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) { return; }
    if ((event.code === 'ControlLeft' || event.code === 'ControlRight') && !event.repeat) { chrome.runtime.sendMessage({ newState: 'recording' }).catch(/*...*/); }

    let actionHandled = false; let videoPlayer;

    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && event.code === 'NumpadDecimal') { event.preventDefault(); event.stopPropagation(); await toggleCurrentBankMode(); actionHandled = true; }
    else if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && code.startsWith("Numpad")) { const numKey = code.slice(-1); if (numKey >= '1' && numKey <= '9') { event.preventDefault(); event.stopPropagation(); videoPlayer = document.querySelector('video.html5-main-video'); if (videoPlayer) { setTimestampForKey(numKey, videoPlayer.currentTime); } actionHandled = true; } }
    if(actionHandled) { return; }

    let bankToSelect = null;
    switch (code) {
        case "NumpadDivide": bankToSelect = 'A'; actionHandled = true; break; case "NumpadMultiply": bankToSelect = 'B'; actionHandled = true; break; case "NumpadSubtract": bankToSelect = 'C'; actionHandled = true; break; case "NumpadAdd": bankToSelect = 'D'; actionHandled = true; break;
        case "NumpadDecimal": if (!event.ctrlKey) { toggleExtensionEnabled(); actionHandled = true; } break;
        case "NumpadEnter": videoPlayer = document.querySelector('video.html5-main-video'); if (videoPlayer) { videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause(); } actionHandled = true; break;
    }
    if (bankToSelect) { chrome.runtime.sendMessage({ newState: 'changing_bank' }).catch(/*...*/); selectBank(bankToSelect); }
    if(actionHandled) { event.preventDefault(); event.stopPropagation(); return; }

    if (!extensionIsEnabled) { return; }

    actionHandled = false; videoPlayer = document.querySelector('video.html5-main-video');
    if (!videoPlayer && code.startsWith("Numpad") && code !== 'NumpadDecimal') { /* Warn */ }
    else if (videoPlayer) {
        switch (code) {
            case "Numpad1": case "Numpad2": case "Numpad3": case "Numpad4": case "Numpad5": case "Numpad6": case "Numpad7": case "Numpad8": case "Numpad9":
                const keyNum = code.slice(-1); if (currentPlaybackMode === 'hold' && heldKeyCode === code) { actionHandled = true; break; }
                const targetT = customTimestamps[keyNum];
                if (targetT !== undefined && targetT !== null && !isNaN(targetT)) {
                    const msgState = (currentPlaybackMode === 'hold') ? 'playing_hold' : 'playing_cue'; chrome.runtime.sendMessage({ newState: msgState }).catch(/*...*/);
                    if (currentPlaybackMode === 'hold') { chrome.runtime.sendMessage({ action: 'padHoldStart', key: keyNum }).catch(/*..*/); } else { chrome.runtime.sendMessage({ action: 'padTriggered', key: keyNum, mode: '1shot' }).catch(/*..*/); }
                    videoPlayer.currentTime = parseFloat(targetT); videoPlayer.play();
                    if (currentPlaybackMode === 'hold') { heldKeyCode = code; heldCueTime = targetT; }
                    actionHandled = true;
                } break;
            case "Numpad0": videoPlayer.pause(); videoPlayer.currentTime = 0; chrome.runtime.sendMessage({ action: 'stopPadTriggered' }).catch(/*...*/); actionHandled = true; break;
        }
    }
    if(actionHandled) { event.preventDefault(); event.stopPropagation(); return; }
}, true);

document.addEventListener('keyup', async (event) => {
     if (!event || !event.code) return; const code = event.code; const videoPlayer = document.querySelector('video.html5-main-video');
     if (code === 'ControlLeft' || code === 'ControlRight') { chrome.runtime.sendMessage({ newState: 'revert_to_base' }).catch(/*...*/); }
     else if (code === heldKeyCode && currentPlaybackMode === 'hold') {
         const keyNumRel = code.slice(-1); chrome.runtime.sendMessage({ action: 'padHoldEnd', key: keyNumRel }).catch(/*...*/);
         if (videoPlayer && heldCueTime !== null) { event.preventDefault(); event.stopPropagation(); videoPlayer.currentTime = parseFloat(heldCueTime); videoPlayer.pause(); }
         heldKeyCode = null; heldCueTime = null; chrome.runtime.sendMessage({ newState: 'revert_to_base' }).catch(/*...*/);
     }
}, true);
