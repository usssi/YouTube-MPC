console.log("[Content_YT_Sampler] Script Injected. Bank Aware Loader (Local Storage + Modifiers + Direct Bank Select).");

const settingsStorageKey = 'youtubeSampler_currentSet';
let customTimestamps = {};
let extensionIsEnabled = true;
let loadedSelectedBank = 'A';
let currentPlaybackMode = '1shot';
let heldKeyCode = null;
let heldCueTime = null;

// Updated function to determine base icon state
function updateBaseIconState() {
    let newBaseState;
    if (!extensionIsEnabled) {
        newBaseState = 'grey'; // Disabled state -> grey (_off)
    } else {
        // Enabled, check mode
        if (currentPlaybackMode === 'hold') {
            newBaseState = 'yellow'; // Hold mode -> yellow (_hold)
        } else { // Includes '1shot' and any potential future modes default
            newBaseState = 'green'; // 1Shot mode -> green (_on)
        }
    }
    console.log(`[Content_YT_Sampler] Requesting background update base state to: ${newBaseState}`);
    chrome.runtime.sendMessage({ baseState: newBaseState }).catch(error => console.log("[Content_YT_Sampler] Error sending base state message:", error));
}

function getDefaultBankData() {
    const timestamps = {};
    for (let i = 1; i <= 9; i++) { timestamps[i.toString()] = null; }
    return { timestamps: timestamps, mode: '1shot' };
}

async function getLatestSettings() {
    try {
        const result = await chrome.storage.local.get([settingsStorageKey]);
        const settings = result[settingsStorageKey] || getDefaultSettings();

        settings.isEnabled = (typeof settings.isEnabled === 'boolean') ? settings.isEnabled : true;
        settings.selectedBank = settings.selectedBank || 'A';
        settings.banks = settings.banks || {};
        const bankIds = ['A', 'B', 'C', 'D'];
        bankIds.forEach(id => {
             if (!settings.banks[id]) {
                 settings.banks[id] = getDefaultBankData();
            } else {
                settings.banks[id].timestamps = settings.banks[id].timestamps || getDefaultBankData().timestamps;
                settings.banks[id].mode = settings.banks[id].mode || getDefaultBankData().mode;
                delete settings.banks[id].timestamps['0'];
            }
        });
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

    settings.banks[bankId] = settings.banks[bankId] || getDefaultBankData();
    settings.banks[bankId].timestamps = settings.banks[bankId].timestamps || {};

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
        let usePlaybackMode = '1shot';

        if (chrome.runtime.lastError) {
            console.error("[Content_YT_Sampler] loadActiveBankData: Error loading settings:", chrome.runtime.lastError);
            const defaultBankData = getDefaultBankData();
            useTimestamps = defaultBankData.timestamps;
            usePlaybackMode = defaultBankData.mode;

        } else {
            const loadedSettings = result[settingsStorageKey];
            console.log("[Content_YT_Sampler] loadActiveBankData: Raw settings loaded:", loadedSettings);

            if (loadedSettings && typeof loadedSettings.banks === 'object' && typeof loadedSettings.selectedBank === 'string') {
                 useIsEnabled = (typeof loadedSettings.isEnabled === 'boolean') ? loadedSettings.isEnabled : true;
                 useSelectedBank = loadedSettings.selectedBank || 'A';
                 const banksData = loadedSettings.banks || {};
                 const selectedBankData = banksData[useSelectedBank] || getDefaultBankData();
                 useTimestamps = selectedBankData.timestamps || {};
                 usePlaybackMode = selectedBankData.mode || '1shot';
                 delete useTimestamps['0'];
            } else {
                 console.warn("[Content_YT_Sampler] loadActiveBankData: Detected OLD or INVALID structure. Using defaults.");
                 if(loadedSettings) console.log("(Received data was:", loadedSettings, ")");
                 const defaultBankData = getDefaultBankData();
                 useTimestamps = defaultBankData.timestamps;
                 usePlaybackMode = defaultBankData.mode;
            }
        }
        extensionIsEnabled = useIsEnabled;
        loadedSelectedBank = useSelectedBank;
        customTimestamps = useTimestamps;
        currentPlaybackMode = usePlaybackMode;
        heldKeyCode = null;
        heldCueTime = null;

        console.log(`[Content_YT_Sampler] loadActiveBankData: === FINAL STATE ===> Enabled: ${extensionIsEnabled}, Selected Bank: ${loadedSelectedBank}, Mode: ${currentPlaybackMode}, Timestamps:`, customTimestamps);

        updateBaseIconState(); // Update icon based on loaded state
    });
}

loadActiveBankData();

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[settingsStorageKey]) {
        console.log("[Content_YT_Sampler] Detected change in settings key (local). Reloading active bank data...");
        loadActiveBankData(); // Reload will call updateBaseIconState
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
    if (bankToSelect) {
        chrome.runtime.sendMessage({ newState: 'changing_bank' }).catch(error => console.log("[Content_YT_Sampler] Error sending changing bank message:", error));
        selectBank(bankToSelect);
    }
    if(actionHandled) { event.preventDefault(); event.stopPropagation(); return; }

    if (!extensionIsEnabled) { return; }

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

    actionHandled = false;
    videoPlayer = document.querySelector('video.html5-main-video');

    if (!videoPlayer && (code.startsWith("Numpad") && code !== 'NumpadDecimal')) {
        console.warn("[Content_YT_Sampler] Numpad pressed but video player not found!");
    } else if (videoPlayer) {
        switch (code) {
            case "Numpad1": case "Numpad2": case "Numpad3":
            case "Numpad4": case "Numpad5": case "Numpad6":
            case "Numpad7": case "Numpad8": case "Numpad9":
                const keyNumber = code.slice(-1);

                if (currentPlaybackMode === 'hold' && heldKeyCode === code) {
                    actionHandled = true;
                    break;
                }

                const targetTime = customTimestamps[keyNumber];
                if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
                    const messageState = (currentPlaybackMode === 'hold') ? 'playing_hold' : 'playing_cue';
                    chrome.runtime.sendMessage({ newState: messageState }).catch(/*...*/);

                    videoPlayer.currentTime = parseFloat(targetTime);
                    videoPlayer.play();

                    if (currentPlaybackMode === 'hold') {
                        heldKeyCode = code;
                        heldCueTime = targetTime;
                    }
                    actionHandled = true;
                } else {
                     actionHandled = false;
                }
                break;

            case "Numpad0":
                 videoPlayer.pause();
                 videoPlayer.currentTime = 0;
                 actionHandled = true;
                 break;
        }
    }

    if(actionHandled) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

}, true);


document.addEventListener('keyup', async (event) => {
     if (!event || !event.code) return;
     const code = event.code;
     const videoPlayer = document.querySelector('video.html5-main-video');

     if (code === 'ControlLeft' || code === 'ControlRight') {
         chrome.runtime.sendMessage({ newState: 'revert_to_base' }).catch(error => console.log("[Content_YT_Sampler] Error sending revert (ctrl) message:", error));
     }
     else if (code === heldKeyCode && currentPlaybackMode === 'hold') {
         console.log(`[Content_YT_Sampler] Hold Mode: Detected keyup for ${code}`);
         if (videoPlayer && heldCueTime !== null) {
             event.preventDefault();
             event.stopPropagation();
             videoPlayer.currentTime = parseFloat(heldCueTime);
             videoPlayer.pause();
             console.log(`[Content_YT_Sampler] Hold Mode: Jumped back to ${heldCueTime} and paused.`);
         }
         heldKeyCode = null;
         heldCueTime = null;
         chrome.runtime.sendMessage({ newState: 'revert_to_base' }).catch(error => console.log("[Content_YT_Sampler] Error sending revert (hold mode keyup) message:", error));
     }

}, true);
