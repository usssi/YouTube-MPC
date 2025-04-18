console.log("[Content_YT_Sampler] Script Injected. Bank Aware Loader (Local Storage + Modifiers + Direct Bank Select).");

const settingsStorageKey = 'youtubeSampler_currentSet';
let customTimestamps = {};
let extensionIsEnabled = true;
let loadedSelectedBank = 'A';

function updateBaseIconState() {
    let isActive = extensionIsEnabled && Object.values(customTimestamps || {}).some(ts => ts !== null && !isNaN(ts));
    let newBaseState = isActive ? 'green' : 'grey';
    console.log(`[Content_YT_Sampler] Requesting background update base state to: ${newBaseState}`);
    chrome.runtime.sendMessage({ baseState: newBaseState }).catch(error => console.log("[Content_YT_Sampler] Error sending base state message:", error));
}

function getDefaultBankData() {
    const timestamps = {};
    for (let i = 1; i <= 9; i++) { timestamps[i.toString()] = null; }
    return { timestamps: timestamps, mode: 'trigger' };
}

async function getLatestSettings() {
    try {
        const result = await chrome.storage.local.get([settingsStorageKey]);
        const settings = result[settingsStorageKey] || {
            isEnabled: true,
            selectedBank: 'A',
            banks: {
                'A': getDefaultBankData(), 'B': getDefaultBankData(),
                'C': getDefaultBankData(), 'D': getDefaultBankData()
            }
        };
        settings.isEnabled = (typeof settings.isEnabled === 'boolean') ? settings.isEnabled : true;
        settings.selectedBank = settings.selectedBank || 'A';
        settings.banks = settings.banks || {};
        const bankIds = ['A', 'B', 'C', 'D'];
        bankIds.forEach(id => {
            settings.banks[id] = settings.banks[id] || getDefaultBankData();
            settings.banks[id].timestamps = settings.banks[id].timestamps || {};
            delete settings.banks[id].timestamps['0'];
        });
        return settings;
    } catch (error) {
        console.error("[Content_YT_Sampler] Error reading settings:", error);
        return null;
    }
}

async function saveUpdatedSettings(settings) {
    try {
        if (!settings) {
            console.error("[Content_YT_Sampler] Attempted to save invalid settings object.");
            return;
        }
        await chrome.storage.local.set({ [settingsStorageKey]: settings });
        console.log("[Content_YT_Sampler] Settings updated in storage by content script:", settings);

    } catch (error) {
        console.error("[Content_YT_Sampler] Error saving updated settings:", error);
    }
}

async function setTimestampForKey(keyNumberString, time) {
    console.log(`[Content_YT_Sampler] Attempting to SET timestamp for key '${keyNumberString}' via Ctrl+Key to ${time}`);
    const settings = await getLatestSettings();
    if (!settings) return;
    const bankId = settings.selectedBank;

    settings.banks[bankId].timestamps[keyNumberString] = parseFloat(time.toFixed(2));

    await saveUpdatedSettings(settings);

}

async function selectBank(bankId) {
    console.log(`[Content_YT_Sampler] Attempting to select Bank ${bankId}`);
    if (!['A', 'B', 'C', 'D'].includes(bankId)) {
        console.warn(`[Content_YT_Sampler] Invalid bankId provided: ${bankId}`);
        return;
    }
    const settings = await getLatestSettings();
    if (!settings) return;

    if (settings.selectedBank !== bankId) {
        settings.selectedBank = bankId;
        console.log(`[Content_YT_Sampler] Selecting Bank: ${settings.selectedBank}`);
        await saveUpdatedSettings(settings);

    } else {
        console.log(`[Content_YT_Sampler] Bank ${bankId} is already selected.`);
    }
}

async function toggleExtensionEnabled() {
    console.log(`[Content_YT_Sampler] Attempting to toggle enable state...`);
    const settings = await getLatestSettings();
    if (!settings) return;
    settings.isEnabled = !settings.isEnabled;
    console.log(`[Content_YT_Sampler] Setting isEnabled to: ${settings.isEnabled}`);
    await saveUpdatedSettings(settings);

}

function loadActiveBankData() {
    console.log("[Content_YT_Sampler] === loadActiveBankData START (local) ===");
    chrome.storage.local.get([settingsStorageKey], (result) => {
        let useTimestamps = {};
        let useIsEnabled = true;
        let useSelectedBank = 'A';

        if (chrome.runtime.lastError) {
            console.error("[Content_YT_Sampler] loadActiveBankData: Error loading settings:", chrome.runtime.lastError);
        } else {
            const loadedSettings = result[settingsStorageKey];
            console.log("[Content_YT_Sampler] loadActiveBankData: Raw settings loaded:", loadedSettings);

            if (loadedSettings && typeof loadedSettings.banks === 'object' && typeof loadedSettings.selectedBank === 'string') {
                 useIsEnabled = (typeof loadedSettings.isEnabled === 'boolean') ? loadedSettings.isEnabled : true;
                 useSelectedBank = loadedSettings.selectedBank || 'A';
                 const banksData = loadedSettings.banks || {};
                 const selectedBankData = banksData[useSelectedBank] || getDefaultBankData();
                 useTimestamps = selectedBankData.timestamps || {};
                 delete useTimestamps['0'];
            } else {
                 console.warn("[Content_YT_Sampler] loadActiveBankData: Detected OLD or INVALID structure. Using defaults.");
                 if(loadedSettings) console.log("(Received data was:", loadedSettings, ")");
                 useTimestamps = getDefaultBankData().timestamps;
            }
        }
        extensionIsEnabled = useIsEnabled;
        loadedSelectedBank = useSelectedBank;
        customTimestamps = useTimestamps;

        console.log(`[Content_YT_Sampler] loadActiveBankData: === FINAL STATE ===> Enabled: ${extensionIsEnabled}, Selected Bank: ${loadedSelectedBank}, Timestamps:`, customTimestamps);

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

    const code = event.code;
    const key = event.key;

    const targetElement = event.target;
    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) {
        return;
    }

    if ((event.code === 'ControlLeft' || event.code === 'ControlRight') && !event.repeat) {
        chrome.runtime.sendMessage({ newState: 'recording' }).catch(error => console.log("[Content_YT_Sampler] Error sending recording message (Ctrl down):", error));
    }


    let actionHandled = false;
    let videoPlayer;

    // --- Step 1: Handle Global Numpad Keys (Bank Select, Toggle, Play/Pause) ---
    let bankToSelect = null;
    switch (code) {
        case "NumpadDivide":   bankToSelect = 'A'; actionHandled = true; break;
        case "NumpadMultiply": bankToSelect = 'B'; actionHandled = true; break;
        case "NumpadSubtract": bankToSelect = 'C'; actionHandled = true; break;
        case "NumpadAdd":      bankToSelect = 'D'; actionHandled = true; break;
        case "NumpadDecimal":  toggleExtensionEnabled(); actionHandled = true; break;
        case "NumpadEnter":
             videoPlayer = document.querySelector('video.html5-main-video');
             if (videoPlayer) { videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause(); }
             actionHandled = true; break;
    }
    // If a bank selection key was pressed, send message THEN select bank
    if (bankToSelect) {
        chrome.runtime.sendMessage({ newState: 'changing_bank' }).catch(error => console.log("[Content_YT_Sampler] Error sending changing bank message:", error));
        selectBank(bankToSelect);
    }
    // Prevent default and return if any global key was handled
    if(actionHandled) { event.preventDefault(); event.stopPropagation(); return; }

    // --- Step 2: Check if Extension is Disabled ---
    if (!extensionIsEnabled) { return; }

    // --- Step 3: Handle Ctrl + Numpad (Set Timestamp - CHECK FIRST!) ---
    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && code.startsWith("Numpad")) {
        const numpadKeyNumber = code.slice(-1);
        if (numpadKeyNumber >= '1' && numpadKeyNumber <= '9') {
            event.preventDefault(); event.stopPropagation();
            videoPlayer = document.querySelector('video.html5-main-video');
            if (videoPlayer) {
                setTimestampForKey(numpadKeyNumber, videoPlayer.currentTime);
            }
            actionHandled = true;
        }
    }
    if(actionHandled) { return; }

    // --- Step 4: Handle Plain Numpad (Trigger Cue or Reset) ---
    actionHandled = true;
    switch (code) {
        case "Numpad1": case "Numpad2": case "Numpad3":
        case "Numpad4": case "Numpad5": case "Numpad6":
        case "Numpad7": case "Numpad8": case "Numpad9":
            const keyNumber = code.slice(-1);
            const targetTime = customTimestamps[keyNumber];
            if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
                chrome.runtime.sendMessage({ newState: 'playing_cue' }).catch(error => console.log("[Content_YT_Sampler] Error sending playing cue message:", error));
                videoPlayer = document.querySelector('video.html5-main-video');
                if (videoPlayer) {
                    videoPlayer.currentTime = parseFloat(targetTime); videoPlayer.play();
                }
            } else {
                 actionHandled = false;
            }
            break;
        case "Numpad0":
             videoPlayer = document.querySelector('video.html5-main-video');
             if (videoPlayer) { videoPlayer.pause(); videoPlayer.currentTime = 0; }
             break;
        default:
            actionHandled = false;
            break;
    }

    if(actionHandled) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

}, true);


// --- Key Up Listener (Unchanged) ---
document.addEventListener('keyup', async (event) => {
     if (!event || !event.code) return;
     const code = event.code;

     if (code === 'ControlLeft' || code === 'ControlRight') {
         chrome.runtime.sendMessage({ newState: 'revert_to_base' }).catch(error => console.log("[Content_YT_Sampler] Error sending revert (ctrl) message:", error));
     }
     // Revert temporary 'playing_cue' or 'changing_bank' icons on Numpad key up
     // Note: The background script timeout handles this automatically now.
     // This keyup logic is mainly for reverting the 'recording' state on Ctrl release.
     // We might still want to revert playing_cue explicitly if timeout is too long?
     // Let's stick with the timeout for now for playing/bank icons.

}, true);
