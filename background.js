let baseIconState = 'grey';
let revertTimerId = null;

// --- EDIT THIS VALUE --- (Duration in milliseconds)
const TEMPORARY_ICON_DURATION_MS = 150;
// ---------------------

const iconStateMap = {
  grey: '_off',
  green: '_on',
  red: '_rec',
  white: '_cue',
  blue: '_bank'
};

function setIcon(state) {
  if (revertTimerId) {
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

function setTemporaryIcon(state, duration = TEMPORARY_ICON_DURATION_MS) {
   setIcon(state);

   revertTimerId = setTimeout(() => {
       console.log(`[YT Sampler BG] Reverting temporary icon (${state}) to base state: ${baseIconState}`);
       setIcon(baseIconState);
       revertTimerId = null;
   }, duration);
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.baseState !== undefined) {
    baseIconState = message.baseState;
    console.log(`[YT Sampler BG] Base state updated to: ${baseIconState}`);
    if (!revertTimerId) {
        setIcon(baseIconState);
    }
  } else if (message.newState === 'recording') {
    setIcon('red'); // Recording icon stays until keyup (revert_to_base)
  } else if (message.newState === 'playing_cue') {
    setTemporaryIcon('white'); // Uses the constant duration
  } else if (message.newState === 'changing_bank') {
    setTemporaryIcon('blue'); // Uses the constant duration
  }
  else if (message.newState === 'revert_to_base') {
     if (!revertTimerId) { // Only revert if a temporary icon timer isn't active
        console.log(`[YT Sampler BG] Reverting icon to base state: ${baseIconState}`);
        setIcon(baseIconState);
     }
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
