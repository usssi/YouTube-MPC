const settingsStorageKey = 'youtubeSampler_currentSet';
let iconTimeout = null;
const iconResetDelay = 500; // ms

// --- Default Settings ---
function getDefaultPadNames() {
    const names = {};
    for (let i = 1; i <= 9; i++) { names[i.toString()] = `PAD ${i}`; }
    return names;
}

function getDefaultBankData() {
    const timestamps = {};
    for (let i = 1; i <= 9; i++) { timestamps[i.toString()] = null; }
    return { timestamps: timestamps, mode: '1shot', name: null, padNames: getDefaultPadNames() };
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

// --- Initialization ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(settingsStorageKey, (result) => {
        if (!result[settingsStorageKey]) {
            chrome.storage.local.set({ [settingsStorageKey]: getDefaultSettings() }, () => {
                console.log("YT MPC Background: Initialized default settings.");
                updateIconBasedOnStorage();
            });
        } else {
             // Ensure existing settings are somewhat valid on install/update if needed
             // For now, just update icon based on potentially existing settings
             updateIconBasedOnStorage();
        }
    });
});

// --- Icon Logic ---
function updateIcon(iconType = 'default') {
    let pathSuffix = "off.png";
    if (iconType === 'on') pathSuffix = "on.png";
    else if (iconType === 'hold') pathSuffix = "hold.png";
    else if (iconType === 'recording') pathSuffix = "recording.png";
    else if (iconType === 'playing') pathSuffix = "playing.png";
    else if (iconType === 'changing') pathSuffix = "changing.png";
     else if (iconType === 'cleared') pathSuffix = "recording.png"; // Reuse recording color for clear feedback

    const paths = {
        "16": `icons/16x/16_${pathSuffix}`,
        "48": `icons/48x/48_${pathSuffix}`,
        "128": `icons/128x/128_${pathSuffix}`
    };

    chrome.action.setIcon({ path: paths });

    // Clear previous timeout if setting a temporary icon
    if (iconTimeout) {
        clearTimeout(iconTimeout);
        iconTimeout = null;
    }
     // Set timeout to reset temporary icons
     if (['recording', 'playing', 'changing', 'cleared'].includes(iconType)) {
         iconTimeout = setTimeout(() => {
             updateIconBasedOnStorage(); // Revert to state based on storage
             iconTimeout = null;
         }, iconResetDelay);
     }
}

async function updateIconBasedOnStorage() {
     try {
        const result = await chrome.storage.local.get([settingsStorageKey]);
        const settings = result[settingsStorageKey] || getDefaultSettings();
        const isEnabled = settings.isEnabled ?? true;
        const selectedBank = settings.selectedBank || 'A';
        const currentMode = settings.banks?.[selectedBank]?.mode || '1shot';

        if (!isEnabled) {
             updateIcon('off');
        } else {
             updateIcon(currentMode === 'hold' ? 'hold' : 'on');
        }
     } catch (error) {
         console.error("Error updating icon based on storage:", error);
         updateIcon('off'); // Default to off on error
     }
}

// --- Message Listener ---

// *** NEW Function to handle clearing pad data ***
async function handleClearPadData(padKey) {
    const key = String(padKey); // Ensure it's a string key
    if (!key || !['1','2','3','4','5','6','7','8','9'].includes(key)) {
        console.warn(`[YT MPC Background] Invalid padKey received for clearPadData: ${padKey}`);
        return;
    }

    const defaultPadName = `PAD ${key}`;
    console.log(`[YT MPC Background] Received request to clear pad ${key}`);

    try {
        const result = await chrome.storage.local.get([settingsStorageKey]);
        const settings = result[settingsStorageKey] || getDefaultSettings(); // Get current or default settings

        const bankId = settings.selectedBank || 'A';

        let changed = false;
        // Ensure bank and nested objects exist before trying to modify
        if (settings.banks && settings.banks[bankId]) {
            if (settings.banks[bankId].timestamps && settings.banks[bankId].timestamps[key] !== null) {
                settings.banks[bankId].timestamps[key] = null;
                changed = true;
            }
            // Also reset the pad name
            if (settings.banks[bankId].padNames) { // Check if padNames exists
                 if (settings.banks[bankId].padNames[key] !== defaultPadName) {
                     settings.banks[bankId].padNames[key] = defaultPadName;
                     changed = true;
                 }
             } else {
                 // If padNames object didn't exist (e.g., very old data), create it
                 settings.banks[bankId].padNames = getDefaultPadNames();
                 // No need to set changed=true here, as the default name is already set above implicitly
             }
        } else {
             console.warn(`[YT MPC Background] Bank ${bankId} not found in settings during clearPadData.`);
             // Optionally initialize the bank if it's missing? For now, just log.
        }

        if (changed) {
            await chrome.storage.local.set({ [settingsStorageKey]: settings });
            console.log(`[YT MPC Background] Pad ${key} data cleared successfully.`);
            // Optional: Send confirmation back or update icon (icon update handled by content script for now)
        } else {
            console.log(`[YT MPC Background] Pad ${key} already clear/default. No change needed.`);
        }

    } catch (error) {
         console.error(`[YT MPC Background] Error clearing pad ${key}:`, error);
    }
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "changeIcon") {
        updateIcon(message.icon || 'default');
    }
    else if (message.action === 'setTimestamp') {
         chrome.storage.local.get([settingsStorageKey], (result) => {
             if (chrome.runtime.lastError) { console.error("Error reading settings for setTimestamp:", chrome.runtime.lastError); return; }
             const settings = result[settingsStorageKey] || getDefaultSettings();
             const bankId = settings.selectedBank || 'A';
             if (!settings.banks[bankId]) settings.banks[bankId] = getDefaultBankData();
             if (!settings.banks[bankId].timestamps) settings.banks[bankId].timestamps = {};

             const timeValue = (message.value !== null && !isNaN(parseFloat(message.value)) && message.value >= 0) ? parseFloat(message.value.toFixed(2)) : null;
             // Cap value here too if needed, though primarily handled in options.js validation now
             const cappedValue = timeValue !== null ? Math.min(timeValue, 99999.99) : null;

             settings.banks[bankId].timestamps[message.key] = cappedValue;

             chrome.storage.local.set({ [settingsStorageKey]: settings }, () => {
                  if (chrome.runtime.lastError) console.error("Error saving timestamp:", chrome.runtime.lastError);
                  else console.log(`[YT MPC Background] Timestamp for pad ${message.key} saved.`);
             });
         });
    }
    else if (message.action === 'toggleEnable') {
        chrome.storage.local.get([settingsStorageKey], (result) => {
             if (chrome.runtime.lastError) { console.error("Error reading settings for toggleEnable:", chrome.runtime.lastError); return; }
             const settings = result[settingsStorageKey] || getDefaultSettings();
             settings.isEnabled = !settings.isEnabled;
             chrome.storage.local.set({ [settingsStorageKey]: settings }, () => {
                  if (chrome.runtime.lastError) console.error("Error saving toggleEnable:", chrome.runtime.lastError);
                  else {
                     console.log("[YT MPC Background] Enable toggled:", settings.isEnabled);
                     updateIconBasedOnStorage(); // Update icon immediately
                  }
             });
         });
    }
    else if (message.action === 'changeBank') {
         chrome.storage.local.get([settingsStorageKey], (result) => {
             if (chrome.runtime.lastError) { console.error("Error reading settings for changeBank:", chrome.runtime.lastError); return; }
             const settings = result[settingsStorageKey] || getDefaultSettings();
             if (['A', 'B', 'C', 'D'].includes(message.targetBank)) {
                 settings.selectedBank = message.targetBank;
                 chrome.storage.local.set({ [settingsStorageKey]: settings }, () => {
                     if (chrome.runtime.lastError) console.error("Error saving changeBank:", chrome.runtime.lastError);
                     else {
                          console.log("[YT MPC Background] Bank changed to:", settings.selectedBank);
                          updateIconBasedOnStorage(); // Update icon immediately
                     }
                 });
             }
         });
    }
     else if (message.action === 'toggleMode') {
          chrome.storage.local.get([settingsStorageKey], (result) => {
             if (chrome.runtime.lastError) { console.error("Error reading settings for toggleMode:", chrome.runtime.lastError); return; }
             const settings = result[settingsStorageKey] || getDefaultSettings();
             const bankId = settings.selectedBank || 'A';
             if (!settings.banks[bankId]) settings.banks[bankId] = getDefaultBankData();
             const currentMode = settings.banks[bankId].mode || '1shot';
             settings.banks[bankId].mode = (currentMode === '1shot') ? 'hold' : '1shot';

             chrome.storage.local.set({ [settingsStorageKey]: settings }, () => {
                  if (chrome.runtime.lastError) console.error("Error saving toggleMode:", chrome.runtime.lastError);
                  else {
                     console.log("[YT MPC Background] Mode for bank", bankId, "toggled to:", settings.banks[bankId].mode);
                     updateIconBasedOnStorage(); // Update icon immediately
                  }
             });
         });
     }
     // *** NEW: Handle message from content script to clear pad data ***
     else if (message.action === 'clearPadData' && message.key) {
          handleClearPadData(message.key); // Call the async handler
     }


    // Keep listener alive for potential async response (though not used here currently)
    // return true;
});

// Update icon when Chrome starts or extension is enabled
chrome.runtime.onStartup.addListener(() => {
  console.log("YT MPC Background: Startup.");
  updateIconBasedOnStorage();
});
chrome.windows.onCreated.addListener(() => {
    console.log("YT MPC Background: Window created.");
    // Sometimes storage isn't ready immediately on window creation, relying on onInstalled/onStartup
    updateIconBasedOnStorage();
});
