// options.js (Autosave only, 'Set Current Cue' removed)

const settingsKey = 'youtubeSamplerKeys_settings';
let saveTimeout;
const debounceTime = 500; // 0.5 seconds debounce
const statusElement = document.getElementById('status');

console.log("Options script loaded (Autosave version).");

// --- Debounce Function ---
function debounce(func, delay) {
  return function(...args) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// --- Save Options Function ---
function saveOptions() {
    console.log("Autosave: saveOptions() called.");
    const timestamps = {};
    for (let i = 0; i <= 9; i++) {
        const inputElement = document.getElementById(`key${i}`);
        if (!inputElement) continue; // Skip if element missing
        const value = inputElement.value;
        if (value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0) {
            timestamps[i.toString()] = parseFloat(value);
        } else {
            timestamps[i.toString()] = null;
        }
    }

    let selectedMode = 'trigger'; // Keep reading mode in case we use it later
    const modeChecked = document.querySelector('input[name="mode"]:checked');
    if (modeChecked) {
        selectedMode = modeChecked.value;
    }

    const settings = {
        timestamps: timestamps,
        mode: selectedMode
    };

    chrome.storage.sync.set({ [settingsKey]: settings }, () => {
        if (chrome.runtime.lastError) {
            statusElement.textContent = 'Error saving settings.';
            statusElement.style.color = 'red';
            console.error("Autosave Error:", chrome.runtime.lastError);
        } else {
            statusElement.textContent = 'Saved.';
            statusElement.style.color = 'green';
            console.log("Autosave success:", settings);
            setTimeout(() => {
                if (statusElement.textContent === 'Saved.') { // Avoid clearing error messages
                    statusElement.textContent = '';
                }
            }, 2000);
        }
    });
}

// --- Restore Options Function ---
function restoreOptions() {
    console.log("Restoring options...");
    chrome.storage.sync.get([settingsKey], (result) => {
        if (chrome.runtime.lastError) {
           console.error("Error loading settings:", chrome.runtime.lastError);
           document.getElementById('mode-trigger').checked = true;
           return;
       }
       const savedSettings = result[settingsKey] || {};
       const savedTimestamps = savedSettings.timestamps || {};
       const savedMode = savedSettings.mode || 'trigger';

       console.log("Restoring options:", savedSettings);

       // Restore timestamps
       for (let i = 0; i <= 9; i++) {
         const inputElement = document.getElementById(`key${i}`);
         if(inputElement) { // Check if element exists
             if (savedTimestamps[i.toString()] !== undefined && savedTimestamps[i.toString()] !== null) {
               inputElement.value = savedTimestamps[i.toString()];
             } else {
               inputElement.value = '';
             }
         }
       }

       // Restore mode (UI only)
       const modeRadioButton = document.getElementById(`mode-${savedMode}`);
       if (modeRadioButton) {
           modeRadioButton.checked = true;
       } else {
           document.getElementById('mode-trigger').checked = true;
       }
     });
}

// --- Setup Listeners ---
// Create the debounced save function *once*
const debouncedSave = debounce(saveOptions, debounceTime);

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Setting up listeners.");
    restoreOptions(); // Load options

    // Add 'input' listeners to number fields for autosave
    console.log("Setting up autosave input listeners...");
    for (let i = 0; i <= 9; i++) {
        const inputElement = document.getElementById(`key${i}`);
        if (inputElement) {
            inputElement.addEventListener('input', (event) => {
                console.log(`Autosave: Input detected on key${i}. Triggering save.`);
                debouncedSave(); // Call the debounced save function
            });
        } else {
             console.warn(`Input element key${i} not found during listener setup.`);
        }
    }

    // Add 'change' listeners to mode radio buttons
    console.log("Setting up mode change listeners...");
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', debouncedSave); // Also trigger save on mode change
    });

    // Removed the setup for '.set-cue-button' listeners

    console.log("Event listeners setup complete.");
});
