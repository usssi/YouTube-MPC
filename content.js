// content.js (Complete Script - Simplified Jumper with Ensure Play)

console.log("YouTube Sampler Keys - Simple Jumper with Play Loaded.");

let customTimestamps = {}; // Only stores the timestamp mappings { '1': 10, '2': 25.5, ... }

// Function to load the configuration from Chrome storage
function loadSettings() {
  // Reads the settings object saved by options.js
  chrome.storage.sync.get(['youtubeSamplerKeys_settings'], (result) => {
    if (chrome.runtime.lastError) {
      // Handle errors during loading (e.g., storage corruption)
      console.error("Error loading settings:", chrome.runtime.lastError);
      customTimestamps = {}; // Use empty timestamps on error
    } else {
      // Extract the 'timestamps' object from the loaded settings
      // Defaults to empty objects if settings or timestamps are not found
      const savedSettings = result.youtubeSamplerKeys_settings || {};
      customTimestamps = savedSettings.timestamps || {};
      console.log("Loaded timestamps:", customTimestamps);
    }
  });
}

// Load the settings when the content script is first injected into the page
loadSettings();

// Listen for changes in Chrome storage
// This updates the timestamps if they are changed in the options page without needing a page refresh
chrome.storage.onChanged.addListener((changes, namespace) => {
  // Check if the change happened in 'sync' storage and affects our settings key
  if (namespace === 'sync' && changes.youtubeSamplerKeys_settings) {
    console.log("Detected change in settings from storage.");
    const newSettings = changes.youtubeSamplerKeys_settings.newValue || {};
    // Update the local timestamps variable with the new values
    customTimestamps = newSettings.timestamps || {};
    console.log("Timestamps updated:", customTimestamps);
  }
});

// --- Main KeyDown Listener ---
// Listens for key presses on the YouTube page
document.addEventListener('keydown', (event) => {
  const key = event.key; // Get the key that was pressed (e.g., '1', 'a', ' ')

  // --- Early Exit Conditions ---
  // Ignore key presses if modifier keys (Ctrl, Alt, Shift, Meta/Cmd) are held down
  if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
    return;
  }
  // Ignore if the user is currently typing inside an input field, text area, or editable element
  const targetElement = event.target;
  if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) {
    return;
  }

  // --- Check if the key is a number key (0-9) ---
  if (key >= '0' && key <= '9') {
    // Retrieve the custom timestamp associated with this number key from our loaded settings
    const targetTime = customTimestamps[key];

    // Proceed only if a valid timestamp is defined for this key
    if (targetTime !== undefined && targetTime !== null && !isNaN(targetTime)) {
      console.log(`Key ${key} mapped to ${targetTime}s. Attempting jump and play.`);

      // Find the main HTML5 video player element on the YouTube page
      const videoPlayer = document.querySelector('video.html5-main-video');

      // If the video player element was successfully found
      if (videoPlayer) {
         console.log(`Found video player. Setting time, preventing default, and ensuring playback.`);

        // Prevent YouTube's default behavior for number keys (jumping to X0% duration)
        // Also stops the event from bubbling up further
        event.preventDefault();
        event.stopPropagation();

        // Set the video's current playback time to the custom timestamp
        // parseFloat ensures the value is treated as a number, even if stored as string
        videoPlayer.currentTime = parseFloat(targetTime);

        // Ensure the video starts playing (or continues playing)
        videoPlayer.play();

      } else {
        // Log a warning if the video player element couldn't be found
        console.warn("YouTube video player element ('video.html5-main-video') not found.");
      }
    }
    // If the pressed key is 0-9 but NOT mapped in our settings,
    // we do nothing here, allowing YouTube's default behavior (if any) for that key.
  }
}, true); // Use capture phase: true means this listener runs earlier in the event propagation
