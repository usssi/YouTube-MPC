let baseIconState = 'grey';
let revertTimerId = null;

const TEMPORARY_ICON_DURATION_MS = 250;

// Add 'yellow' state mapped to '_hold' suffix
const iconStateMap = {
  grey: '_off',    // Disabled
  green: '_on',    // Enabled + 1Shot Mode
  yellow: '_hold', // Enabled + Hold Mode
  red: '_rec',     // Recording (Ctrl held)
  white: '_cue',   // Playing Cue (temporary)
  blue: '_bank'    // Changing Bank (temporary)
};

function setIcon(state) {
  if (state !== 'red' && state !== 'white' && revertTimerId) {
      clearTimeout(revertTimerId);
      revertTimerId = null;
  } else if ((state === 'red' || state === 'white') && revertTimerId) {
      clearTimeout(revertTimerId);
      revertTimerId = null;
  }

  const suffix = iconStateMap[state];
  if (!suffix) {
    console.error(`[YT Sampler BG] Unknown icon state requested: ${state}`);
    return;
  }

  const iconPaths = {
    "16": `icons/16x/16${suffix}.png`,
    "48": `icons/48x/48${suffix}.png`,
    "128": `icons/128x/128${suffix}.png`
  };

  console.log(`[YT Sampler BG] Setting icon to state: ${state} (Files: ${JSON.stringify(iconPaths)})`);
  chrome.action.setIcon({ path: iconPaths })
    .catch(error => console.error(`[YT Sampler BG] Error setting icon to ${state}:`, error));
}

function setTimedTemporaryIcon(state, duration = TEMPORARY_ICON_DURATION_MS) {
   setIcon(state);
   if (revertTimerId) clearTimeout(revertTimerId);
   revertTimerId = setTimeout(() => {
       console.log(`[YT Sampler BG] Reverting timed temporary icon (${state}) to base state: ${baseIconState}`);
       setIcon(baseIconState);
       revertTimerId = null;
   }, duration);
}

function setStickyIcon(state) {
    if (revertTimerId) {
        clearTimeout(revertTimerId);
        revertTimerId = null;
    }
    setIcon(state);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle base state updates (grey, green, yellow)
  if (message.baseState !== undefined && iconStateMap[message.baseState]) {
    baseIconState = message.baseState; // Store the correct base state
    console.log(`[YT Sampler BG] Base state updated to: ${baseIconState}`);
    // Only set icon if no temporary timer is active
    // Sticky states (red/white) will be handled by revert_to_base
    if (!revertTimerId) {
        setIcon(baseIconState);
    }
  }
  // Handle temporary/sticky states
  else if (message.newState === 'recording') {
    setStickyIcon('red');
  } else if (message.newState === 'playing_hold') {
    setStickyIcon('white'); // Use white for hold playback (sticky)
  } else if (message.newState === 'playing_cue') {
    setTimedTemporaryIcon('white'); // Use white for 1shot playback (timed)
  } else if (message.newState === 'changing_bank') {
    setTimedTemporaryIcon('blue');
  }
  else if (message.newState === 'revert_to_base') {
     // Always revert to the currently stored base state
     console.log(`[YT Sampler BG] Reverting icon to base state: ${baseIconState}`);
     setIcon(baseIconState); // This clears any timer and sets the correct base icon
  }
});

chrome.runtime.onInstalled.addListener(() => {
  baseIconState = 'grey';
  setIcon('grey');
  console.log("[YT Sampler BG] Extension installed/updated. Set default icon.");
});
chrome.runtime.onStartup.addListener(() => {
    baseIconState = 'grey';
    setIcon('grey');
    console.log("[YT Sampler BG] Browser startup. Set default icon.");
});
