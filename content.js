// content.js (Bank Aware Loader - Uses chrome.storage.local - COMPLETE)

console.log("[Content_YT_Sampler] Script Injected. Bank Aware Loader (Using Local Storage).");

const settingsStorageKey = 'youtubeSampler_currentSet'; // Key for storage (now local)
let customTimestamps = {}; // Stores timestamps for the SELECTED bank
let extensionIsEnabled = true; // Global enable state
let loadedSelectedBank = 'A'; // Track which bank's data is loaded

// --- Load settings, check structure, determine selected bank, load its timestamps from LOCAL storage ---
function loadActiveBankData() {
    console.log("[Content_YT_Sampler] === loadActiveBankData START (local) ===");
    // *** CHANGED TO local ***
    chrome.storage.local.get([settingsStorageKey], (result) => {
        let useTimestamps = {};
        let useIsEnabled = true;
        let useSelectedBank = 'A';

        if (chrome.runtime.lastError) {
            console.error("[Content_YT_Sampler] loadActiveBankData: Error loading settings:", chrome.runtime.lastError);
            // Use defaults on error
        } else {
            const loadedSettings = result[settingsStorageKey];
            console.log("[Content_YT_Sampler] loadActiveBankData: Raw settings loaded:", loadedSettings);

            // --- Structure Check ---
            if (loadedSettings && typeof loadedSettings.banks === 'object' && typeof loadedSettings.selectedBank === 'string') {
                 console.log("[Content_YT_Sampler] loadActiveBankData: Detected NEW structure.");
                 useIsEnabled = (typeof loadedSettings.isEnabled === 'boolean') ? loadedSettings.isEnabled : true;
                 useSelectedBank = loadedSettings.selectedBank || 'A';
                 const banksData = loadedSettings.banks || {};
                 const selectedBankData = banksData[useSelectedBank] || {}; // Use the loaded selected bank
                 useTimestamps = selectedBankData.timestamps || {};
            } else {
                 console.warn("[Content_YT_Sampler] loadActiveBankData: Detected OLD or INVALID structure. Using defaults.");
                 if(loadedSettings) console.log("(Received data was:", loadedSettings, ")"); // Log bad data
                 // Keep default values: useIsEnabled=true, useSelectedBank='A', useTimestamps={}
            }
            // --- End Structure Check ---
        }

        // Update module-level variables
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
    console.log(`[Content_YT_Sampler] Storage onChanged detected. Area: ${areaName}`);
    // *** CHANGED TO local ***
    if (areaName === 'local' && changes[settingsStorageKey]) {
        console.log("[Content_YT_Sampler] Detected change in our settings key (local). Reloading active bank data...");
        console.log("[Content_YT_Sampler] Change details:", changes[settingsStorageKey]);
        loadActiveBankData(); // Reload ALL data based on the change
    }
});

// --- KeyDown Listener ---
document.addEventListener('keydown', (event) => {
    const key = event.key;
    // Use the module-level 'loadedSelectedBank' for logging
    // console.log(`[Content_YT_Sampler] Keydown: Key='${key}', Enabled=${extensionIsEnabled}, Current Bank Context='${loadedSelectedBank}'`); // Less verbose log

    // Early exit conditions
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) { return; }
    const targetElement = event.target;
    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) { return; }

    // Check if Extension is Globally Enabled
    if (!extensionIsEnabled) { return; }

    // Process Number Keys ONLY if Enabled
    if (key >= '0' && key <= '9') {
        // Use the timestamps loaded for the currently selected bank
        const targetTime = customTimestamps[key];
        // console.log(`[Content_YT_Sampler] Timestamp lookup for key '${key}' in bank '${loadedSelectedBank}':`, targetTime); // Less verbose log

        if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
            const videoPlayer = document.querySelector('video.html5-main-video');
            if (videoPlayer) {
                console.log(`[Content_YT_Sampler] Action: Key ${key} (Bank ${loadedSelectedBank}) -> ${targetTime}s`); // More informative log
                try {
                    event.preventDefault();
                    event.stopPropagation();
                    videoPlayer.currentTime = parseFloat(targetTime);
                    videoPlayer.play();
                    // console.log(`[Content_YT_Sampler] Action complete for key ${key}.`); // Less verbose log
                } catch (e) {
                     console.error("[Content_YT_Sampler] Error executing video action:", e);
                }
            } else {
                console.warn("[Content_YT_Sampler] Hotkey pressed, valid timestamp, but video player ('video.html5-main-video') not found!");
            }
        } else {
            // console.log(`[Content_YT_Sampler] No valid timestamp mapped for key '${key}' in bank '${loadedSelectedBank}'.`); // Less verbose log
        }
    }
}, true); // Use capture phase
