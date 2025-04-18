// content.js (Checks Enable/Disable state from sync storage)

console.log("YouTube Sampler Keys - Simple Jumper with Enable/Disable Check.");

const currentSetStorageKey = 'youtubeSampler_currentSet'; // Using sync storage
let customTimestamps = {};
let extensionIsEnabled = true; // Default to enabled

// --- Load the currently active set AND enabled state from storage ---
function loadActiveSet() {
  console.log("Content Script: Loading active set and status from storage...");
  chrome.storage.sync.get([currentSetStorageKey], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error loading active set:", chrome.runtime.lastError);
      customTimestamps = {};
      extensionIsEnabled = true; // Default to enabled on error
    } else {
      const savedSettings = result[currentSetStorageKey]; // Allow undefined if never saved
      customTimestamps = savedSettings?.timestamps || {};
      // Set global enabled state, default to true if setting is missing entirely or isEnabled is not set
      extensionIsEnabled = (savedSettings && typeof savedSettings.isEnabled === 'boolean') ? savedSettings.isEnabled : true;

      console.log("Loaded active timestamps:", customTimestamps);
      console.log("Extension enabled state:", extensionIsEnabled);
    }
  });
}

// Load the active set when the script initializes
loadActiveSet();

// --- Listen for changes in storage ---
// Updates the active set AND enabled state if changed via the options page
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[currentSetStorageKey]) {
    console.log("Content Script: Detected change in active set/status. Reloading.");
    const newSettings = changes[currentSetStorageKey].newValue; // Allow undefined
    customTimestamps = newSettings?.timestamps || {};
    // Update global enabled state, default true
    extensionIsEnabled = (newSettings && typeof newSettings.isEnabled === 'boolean') ? newSettings.isEnabled : true;

    console.log("Updated active timestamps:", customTimestamps);
    console.log("Updated extension enabled state:", extensionIsEnabled);
  }
});

// --- KeyDown Listener ---
document.addEventListener('keydown', (event) => {
    const key = event.key;

    // --- Early Exit Conditions ---
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) { return; }
    const targetElement = event.target;
    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) { return; }

    // --- <<< Check if Extension is Globally Enabled >>> ---
    if (!extensionIsEnabled) {
        // If disabled, do nothing and let default YouTube behavior happen
        // console.log("Sampler Keys disabled globally."); // Optional log
        return;
    }
    // --- <<< End Enable/Disable Check >>> ---


    // --- Process Number Keys ONLY if Enabled ---
    if (key >= '0' && key <= '9') {
        const targetTime = customTimestamps[key];

        if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
            // --- If key is mapped AND extension is enabled, handle it ---
            const videoPlayer = document.querySelector('video.html5-main-video');
            if (videoPlayer) {
                console.log(`Sampler Key ${key} pressed (enabled). Jumping to ${targetTime}s.`); // Log when active
                event.preventDefault(); // Prevent default YouTube action
                event.stopPropagation();
                videoPlayer.currentTime = parseFloat(targetTime);
                videoPlayer.play();
            } else {
                console.warn("Hotkey pressed, but video player not found.");
            }
        }
        // If key is 0-9 but not mapped, we do nothing (allow default) even if enabled.
    }
}, true); // Use capture phase
