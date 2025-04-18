// content.js

console.log("YouTube Sampler Keys content script loaded.");

let customTimestamps = {}; // To hold the mapping like { '1': 15, '2': 30.5, ... }

// Function to load timestamps from storage
function loadTimestamps() {
  chrome.storage.sync.get(['youtubeSamplerKeys_timestamps'], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error loading timestamps:", chrome.runtime.lastError);
      customTimestamps = {}; // Default to empty if error
    } else {
      customTimestamps = result.youtubeSamplerKeys_timestamps || {}; // Use saved data or default to empty object
      console.log("Loaded timestamps:", customTimestamps);
    }
  });
}

// Load timestamps when the script starts
loadTimestamps();

// Listen for changes in storage (e.g., when options are saved)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.youtubeSamplerKeys_timestamps) {
    customTimestamps = changes.youtubeSamplerKeys_timestamps.newValue || {};
    console.log("Timestamps updated:", customTimestamps);
  }
});

// Listen for keydown events on the whole page
document.addEventListener('keydown', (event) => {
  // Ignore key presses if modifier keys (Ctrl, Alt, Shift, Meta) are held
  if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
    return;
  }

  // Ignore if the user is typing in an input field, textarea, or contenteditable element
  const targetElement = event.target;
  if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) {
    return;
  }

  // Check if the pressed key is a number key (1-9 or 0)
  const key = event.key; // '1', '2', ..., '9', '0'

  if (key >= '0' && key <= '9') {
    const targetTime = customTimestamps[key]; // Get the custom time for this key

    if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
      console.log(`Key ${key} pressed, seeking to ${targetTime} seconds.`);

      // Find the main YouTube video element
      const videoPlayer = document.querySelector('video.html5-main-video');

      if (videoPlayer) {
        // Prevent YouTube's default behavior for number keys
        event.preventDefault();
        event.stopPropagation();

        // Set the video's current time
        videoPlayer.currentTime = parseFloat(targetTime);
      } else {
        console.warn("YouTube video player not found.");
      }
    } else {
      // Optional: Let YouTube handle the key if no custom time is set for it
      // console.log(`No custom timestamp defined for key ${key}. Allowing default behavior.`);
      // If you *always* want to override 1-0, uncomment the preventDefault/stopPropagation below
      // event.preventDefault();
      // event.stopPropagation();
    }
  }
}, true); // Use capture phase to catch event early
