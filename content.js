// content.js (Simplified Jumper with Ensure Play - Message Listener REMOVED)

console.log("YouTube Sampler Keys - Simple Jumper with Play Loaded.");

let customTimestamps = {}; // Only stores the timestamp mappings { '1': 10, '2': 25.5, ... }

// Function to load the configuration from Chrome storage
function loadSettings() {
  chrome.storage.sync.get(['youtubeSamplerKeys_settings'], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error loading settings:", chrome.runtime.lastError);
      customTimestamps = {};
    } else {
      const savedSettings = result.youtubeSamplerKeys_settings || {};
      customTimestamps = savedSettings.timestamps || {};
      console.log("Loaded timestamps:", customTimestamps);
    }
  });
}

// Load the settings when the content script is first injected
loadSettings();

// Listen for changes in Chrome storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.youtubeSamplerKeys_settings) {
    console.log("Detected change in settings from storage.");
    const newSettings = changes.youtubeSamplerKeys_settings.newValue || {};
    customTimestamps = newSettings.timestamps || {};
    console.log("Timestamps updated:", customTimestamps);
  }
});

// --- Main KeyDown Listener ---
document.addEventListener('keydown', (event) => {
  const key = event.key;

  // --- Early Exit Conditions ---
  if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) { return; }
  const targetElement = event.target;
  if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) { return; }

  // --- Check if the key is a number key (0-9) ---
  if (key >= '0' && key <= '9') {
    const targetTime = customTimestamps[key];

    // Proceed only if a valid timestamp is defined for this key
    if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
      // console.log(`Key ${key} mapped to ${targetTime}s. Attempting jump and play.`); // Optional: less verbose log
      const videoPlayer = document.querySelector('video.html5-main-video');

      if (videoPlayer) {
        // console.log(`Found video player. Setting time, preventing default, ensuring playback.`); // Optional: less verbose log
        event.preventDefault();
        event.stopPropagation();
        videoPlayer.currentTime = parseFloat(targetTime);
        videoPlayer.play();
      } else {
        console.warn("YouTube video player element ('video.html5-main-video') not found.");
      }
    }
  }
}, true); // Use capture phase

// Message listener removed from this version
