// content.js

console.log("YouTube Sampler Keys content script loaded.");

let customSettings = { // Store both timestamps and mode
    timestamps: {},
    mode: 'trigger' // Default mode
};
const keysCurrentlyDown = new Set(); // Track which keys are currently held down

// Function to load settings from storage
function loadSettings() {
  // Use the same key as in options.js
  chrome.storage.sync.get(['youtubeSamplerKeys_settings'], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error loading settings:", chrome.runtime.lastError);
      // Use default settings on error
      customSettings = { timestamps: {}, mode: 'trigger' };
    } else {
      // Use saved data or default object
      customSettings = result.youtubeSamplerKeys_settings || { timestamps: {}, mode: 'trigger' };
      console.log("Loaded settings:", customSettings);
    }
  });
}

// Load settings when the script starts
loadSettings();

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.youtubeSamplerKeys_settings) {
    customSettings = changes.youtubeSamplerKeys_settings.newValue || { timestamps: {}, mode: 'trigger' };
    console.log("Settings updated:", customSettings);
     // Clear keysCurrentlyDown if settings change, just in case
    keysCurrentlyDown.clear();
  }
});

// --- Key Down Listener ---
document.addEventListener('keydown', (event) => {
  const key = event.key;

  // Ignore if modifier keys are held or if typing in input fields
  if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey || event.repeat) {
      // IMPORTANT: event.repeat helps ignore the browser's automatic key repetition
      // However, we still need keysCurrentlyDown for the Hold mode logic on keyup
      // And to prevent accidental double-trigger if event.repeat isn't perfectly reliable
      return;
  }
   const targetElement = event.target;
  if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) {
    return;
  }

  // Check if it's a sampler key (0-9)
  if (key >= '0' && key <= '9') {
    const targetTime = customSettings.timestamps[key];

    // Check if a custom time is defined AND if the key is NOT already down
    if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime) && !keysCurrentlyDown.has(key)) {
        console.log(`Key ${key} down. Mode: ${customSettings.mode}. Seeking to ${targetTime}s.`);

        const videoPlayer = document.querySelector('video.html5-main-video');

        if (videoPlayer) {
            // Mark the key as down BEFORE changing video state
            keysCurrentlyDown.add(key);

            // Prevent default YouTube behavior
            event.preventDefault();
            event.stopPropagation();

            // Seek to the target time
            videoPlayer.currentTime = parseFloat(targetTime);

            // Specific actions based on mode
            if (customSettings.mode === 'hold') {
                // In Hold mode, ensure video plays
                videoPlayer.play();
            }
             // In Trigger mode, just seeking is enough (done above)

        } else {
            console.warn("YouTube video player not found.");
        }
    } else if (keysCurrentlyDown.has(key)) {
         // If key is already down, prevent default anyway to stop YouTube's action on repeats
         if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
             event.preventDefault();
             event.stopPropagation();
         }
    }
  }
}, true); // Use capture phase


// --- Key Up Listener ---
document.addEventListener('keyup', (event) => {
    const key = event.key;

    // Check if the released key is one we were tracking
    if (keysCurrentlyDown.has(key)) {
        console.log(`Key ${key} up. Mode: ${customSettings.mode}.`);

        // Mark the key as no longer down
        keysCurrentlyDown.delete(key);

        // Specific actions for HOLD mode on key release
        if (customSettings.mode === 'hold') {
            // Only act if it was a valid sampler key
             const targetTime = customSettings.timestamps[key];
             if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
                const videoPlayer = document.querySelector('video.html5-main-video');
                if (videoPlayer) {
                    console.log(`Pausing video because key ${key} released in Hold mode.`);
                    videoPlayer.pause();

                    // Prevent potential default browser/youtube actions on keyup too
                    event.preventDefault();
                    event.stopPropagation();
                } else {
                     console.warn("YouTube video player not found for keyup pause.");
                }
            }
        }
    }
     // No specific action needed for Trigger mode on keyup
}, true); // Use capture phase
