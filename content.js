console.log("[Content_YT_Sampler] Script Injected. Bank Aware Loader (Local Storage + Modifiers + Direct Bank Select).");

const settingsStorageKey = 'youtubeSampler_currentSet';
let customTimestamps = {};
let extensionIsEnabled = true;
let loadedSelectedBank = 'A';

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
            }
        }
        extensionIsEnabled = useIsEnabled;
        loadedSelectedBank = useSelectedBank;
        customTimestamps = useTimestamps;

        console.log(`[Content_YT_Sampler] loadActiveBankData: === FINAL STATE ===> Enabled: ${extensionIsEnabled}, Selected Bank: ${loadedSelectedBank}, Timestamps:`, customTimestamps);
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
    if (!event || !event.key || !event.code) {
        console.warn("[Content_YT_Sampler] Keydown event missing key/code property:", event);
        return;
    }

    const code = event.code;
    const key = event.key;

    const targetElement = event.target;
    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) {
        return;
    }

    let actionHandled = false;
    let videoPlayer;

    switch (code) {
        case "NumpadDivide":
             console.log("[Content_YT_Sampler] Action: Numpad / -> Select Bank A");
             event.preventDefault(); event.stopPropagation();
             selectBank('A'); actionHandled = true; break;
        case "NumpadMultiply":
             console.log("[Content_YT_Sampler] Action: Numpad * -> Select Bank B");
             event.preventDefault(); event.stopPropagation();
             selectBank('B'); actionHandled = true; break;
        case "NumpadSubtract":
             console.log("[Content_YT_Sampler] Action: Numpad - -> Select Bank C");
             event.preventDefault(); event.stopPropagation();
             selectBank('C'); actionHandled = true; break;
        case "NumpadAdd":
             console.log("[Content_YT_Sampler] Action: Numpad + -> Select Bank D");
             event.preventDefault(); event.stopPropagation();
             selectBank('D'); actionHandled = true; break;
        case "NumpadDecimal":
             console.log("[Content_YT_Sampler] Action: Numpad . -> Toggle Enable/Disable");
             event.preventDefault(); event.stopPropagation();
             toggleExtensionEnabled(); actionHandled = true; break;
        case "NumpadEnter":
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
             actionHandled = true; break;

    }

    if (actionHandled) return;

    if (!extensionIsEnabled) {
        return;
    }

    actionHandled = true;
    switch (code) {
        case "Numpad1": case "Numpad2": case "Numpad3":
        case "Numpad4": case "Numpad5": case "Numpad6":
        case "Numpad7": case "Numpad8": case "Numpad9":
            const keyNumber = code.slice(-1);
            const targetTime = customTimestamps[keyNumber];
            console.log(`[Content_YT_Sampler] Numpad ${keyNumber} pressed. Timestamp lookup in bank '${loadedSelectedBank}':`, targetTime);
            if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
                videoPlayer = document.querySelector('video.html5-main-video');
                if (videoPlayer) {
                    console.log(`[Content_YT_Sampler] Action: Numpad ${keyNumber} (Bank ${loadedSelectedBank}) -> ${targetTime}s`);
                    event.preventDefault(); event.stopPropagation();
                    videoPlayer.currentTime = parseFloat(targetTime); videoPlayer.play();
                } else { console.warn(`[Content_YT_Sampler] Numpad ${keyNumber}: Video player not found!`); }
            } else {
                 actionHandled = false;
            }
            break;

        case "Numpad0":
             videoPlayer = document.querySelector('video.html5-main-video');
             if (videoPlayer) {
                 console.log("[Content_YT_Sampler] Action: Numpad 0 -> Pause & Reset to 0s");
                 event.preventDefault(); event.stopPropagation(); videoPlayer.pause(); videoPlayer.currentTime = 0;
             } else { console.warn("[Content_YT_Sampler] Numpad 0: Video player not found!"); }
             break;

        default:
            actionHandled = false;
            break;
    }

    if (actionHandled) return;


    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && code.startsWith("Numpad")) {
        const numpadKeyNumber = code.slice(-1);

        if (numpadKeyNumber >= '1' && numpadKeyNumber <= '9') {
            console.log(`[Content_YT_Sampler] Ctrl+${code} detected. Attempting to SET timestamp...`);
            event.preventDefault(); event.stopPropagation();
            videoPlayer = document.querySelector('video.html5-main-video');
            if (videoPlayer) {
                const currentTime = videoPlayer.currentTime;
                setTimestampForKey(numpadKeyNumber, currentTime);
            } else {
                console.warn("[Content_YT_Sampler] Ctrl+NumpadKey: Video player not found.");
            }
            actionHandled = true;
        }
    }


}, true);
