// content.js (Ctrl+Num to Set Timestamp, No Clear Shortcut)

console.log("[Content_YT_Sampler] Script Injected. Bank Aware Loader (Local Storage + Ctrl-Set).");

const settingsStorageKey = 'youtubeSampler_currentSet'; // Key for local storage
let customTimestamps = {}; // Stores timestamps for the SELECTED bank
let extensionIsEnabled = true; // Global enable state
let loadedSelectedBank = 'A'; // Track which bank's data is loaded

// --- Helper: Read latest settings from storage ---
async function getLatestSettings() {
    try {
        // Use local storage
        const result = await chrome.storage.local.get([settingsStorageKey]);
        const settings = result[settingsStorageKey] || {};
        // Ensure basic structure exists for safe access later
        settings.isEnabled = (typeof settings.isEnabled === 'boolean') ? settings.isEnabled : true;
        settings.selectedBank = settings.selectedBank || 'A';
        settings.banks = settings.banks || {};
        return settings;
    } catch (error) {
        console.error("[Content_YT_Sampler] Error reading settings:", error);
        return null;
    }
}

// --- Helper: Save updated settings object ---
async function saveUpdatedSettings(settings) {
    try {
        // Use local storage
        await chrome.storage.local.set({ [settingsStorageKey]: settings });
        console.log("[Content_YT_Sampler] Settings updated in storage by content script.");
        // onChanged listener will trigger loadActiveBankData automatically
    } catch (error) {
        console.error("[Content_YT_Sampler] Error saving updated settings:", error);
    }
}

// --- Function to SET timestamp via modifier key ---
async function setTimestampForKey(key, time) {
    console.log(`[Content_YT_Sampler] Attempting to SET timestamp for key '${key}' to ${time}`);
    const settings = await getLatestSettings();
    if (!settings) return;

    const bankId = settings.selectedBank; // Use the selected bank from loaded settings

    // Ensure bank and timestamps objects exist
    settings.banks[bankId] = settings.banks[bankId] || { timestamps: {}, mode: 'trigger' };
    settings.banks[bankId].timestamps = settings.banks[bankId].timestamps || {};

    // Update the specific timestamp
    settings.banks[bankId].timestamps[key] = parseFloat(time.toFixed(2)); // Store with precision

    // Save the whole object back
    await saveUpdatedSettings(settings);
     // Optional: Add brief visual feedback on the page here
     // Example: showStatusMessage(`Set Key ${key} in Bank ${bankId} to ${time.toFixed(2)}s`);
}

// --- Function to CLEAR timestamp (REMOVED - No longer used) ---
// async function clearTimestampForKey(key) { ... }


// --- Load the currently active set AND enabled state from storage ---
function loadActiveBankData() {
    console.log("[Content_YT_Sampler] === loadActiveBankData START (local) ===");
    // *** Using local storage ***
    chrome.storage.local.get([settingsStorageKey], (result) => {
        let useTimestamps = {};
        let useIsEnabled = true;
        let useSelectedBank = 'A';

        if (chrome.runtime.lastError) {
            console.error("[Content_YT_Sampler] loadActiveBankData: Error loading settings:", chrome.runtime.lastError);
        } else {
            const loadedSettings = result[settingsStorageKey];
            console.log("[Content_YT_Sampler] loadActiveBankData: Raw settings loaded:", loadedSettings);

            // Structure Check
            if (loadedSettings && typeof loadedSettings.banks === 'object' && typeof loadedSettings.selectedBank === 'string') {
                 console.log("[Content_YT_Sampler] loadActiveBankData: Detected NEW structure.");
                 useIsEnabled = (typeof loadedSettings.isEnabled === 'boolean') ? loadedSettings.isEnabled : true;
                 useSelectedBank = loadedSettings.selectedBank || 'A';
                 const banksData = loadedSettings.banks || {};
                 const selectedBankData = banksData[useSelectedBank] || {};
                 useTimestamps = selectedBankData.timestamps || {};
            } else {
                 console.warn("[Content_YT_Sampler] loadActiveBankData: Detected OLD or INVALID structure. Using defaults.");
                 if(loadedSettings) console.log("(Received data was:", loadedSettings, ")");
            }
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
    if (areaName === 'local' && changes[settingsStorageKey]) { // Using local
        console.log("[Content_YT_Sampler] Detected change in settings key (local). Reloading active bank data...");
        loadActiveBankData();
    }
});

// --- KeyDown Listener ---
document.addEventListener('keydown', async (event) => { // Added async
    const key = event.key;

    // Early exit conditions
    const targetElement = event.target;
    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) {
         // Don't interfere with typing
         return;
    }
    // Allow processing even if modifiers are down initially, check later

    // Check if Extension is Globally Enabled FIRST
    if (!extensionIsEnabled) { return; }

    // --- Process Number Keys ---
    if (key >= '0' && key <= '9') {

        // --- Check for CTRL ONLY + Number action (SET Timestamp) ---
        if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
             console.log(`[Content_YT_Sampler] Ctrl+${key} detected. Attempting to SET timestamp...`);
             event.preventDefault(); // Prevent any default Ctrl+Number action
             event.stopPropagation();
             const videoPlayer = document.querySelector('video.html5-main-video');
             if (videoPlayer) {
                 const currentTime = videoPlayer.currentTime;
                 // Call async function - let it run in background
                 setTimestampForKey(key, currentTime);
             } else {
                  console.warn("[Content_YT_Sampler] Ctrl+Key: Video player not found.");
             }
             return; // Action handled, exit listener

        // --- Check for REGULAR Number Key press (No relevant modifiers) ---
        } else if (!event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
            // Regular timestamp jump logic
            const targetTime = customTimestamps[key];

            if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
                const videoPlayer = document.querySelector('video.html5-main-video');
                if (videoPlayer) {
                    console.log(`[Content_YT_Sampler] Action: Key ${key} (Bank ${loadedSelectedBank}) -> ${targetTime}s`);
                    try {
                        event.preventDefault();
                        event.stopPropagation();
                        videoPlayer.currentTime = parseFloat(targetTime);
                        videoPlayer.play();
                    } catch (e) {
                         console.error("[Content_YT_Sampler] Error executing video action:", e);
                    }
                } else {
                    console.warn("[Content_YT_Sampler] Hotkey pressed, valid timestamp, but video player not found!");
                }
            }
            // If timestamp not mapped for this key, do nothing, allow default YouTube action (if any)
        }
        // Ignore Number keys if other modifiers (Alt, Meta, or Shift+Ctrl) are pressed
    }

    // --- Handle potential dedicated Stop/Start keys (if added later) ---
    // if (key === 'Escape' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) { ... }

}, true); // Use capture phase
