// options.js (Simplified: Enable/Disable + Clear All - NO File I/O)

const currentSetStorageKey = 'youtubeSampler_currentSet'; // Use sync storage
const statusElement = document.getElementById('status');
const enableSwitchElement = document.getElementById('enable-switch');

let isInitialized = false; // Initialization Flag

console.log("Options script loaded (Enable/Disable + ClearAll version).");

// --- Helper function to read current UI state (including switch) ---
function getCurrentSettingsFromUI() {
    const timestamps = {};
    for (let i = 0; i <= 9; i++) {
        const inputElement = document.getElementById(`key${i}`);
        if (!inputElement) continue;
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

    const isEnabled = enableSwitchElement ? enableSwitchElement.checked : true;

    return {
        isEnabled: isEnabled,
        timestamps: timestamps,
        mode: selectedMode
    };
}

// --- Helper function to update UI from data (including switch) ---
function updateUIFromSettings(settings) {
    const timestampsData = settings?.timestamps || {};
    const modeData = settings?.mode || 'trigger';
    const isEnabledData = (settings && typeof settings.isEnabled === 'boolean') ? settings.isEnabled : true;

    console.log("Updating UI from settings:", settings);

    // Update timestamp inputs
    for (let i = 0; i <= 9; i++) {
         const inputElement = document.getElementById(`key${i}`);
         if (inputElement) {
             const savedTime = timestampsData[i.toString()];
             inputElement.value = (savedTime !== undefined && savedTime !== null) ? savedTime : '';
         }
    }
    // Update mode radio button (though hidden)
    const modeRadioButton = document.getElementById(`mode-${modeData}`);
    if (modeRadioButton) {
         modeRadioButton.checked = true;
    } else {
         document.getElementById('mode-trigger')?.setAttribute('checked', true);
    }
    // Update enable switch state
    if (enableSwitchElement) {
        enableSwitchElement.checked = isEnabledData;
    }
}


// --- Save the current UI state to Chrome Storage ---
function saveCurrentSetToStorage() {
    if (!isInitialized) {
        console.log("Skipping save: Not initialized yet.");
        return;
    }
    const settings = getCurrentSettingsFromUI();
    console.log("Saving current set to storage:", settings);

    chrome.storage.sync.set({ [currentSetStorageKey]: settings }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving current set to storage:", chrome.runtime.lastError);
            statusElement.textContent = 'Error saving settings!';
            statusElement.style.color = 'red';
        } else {
            console.log("Current set saved to storage successfully.");
            statusElement.textContent = 'Saved.'; // Show confirmation
            statusElement.style.color = 'green';
            statusElement.style.opacity = '1';
            setTimeout(() => {
                 if (statusElement.textContent === 'Saved.') {
                    statusElement.style.opacity = '0';
                 }
             }, 1500);
        }
    });
}

// --- Restore Options from Storage on Load ---
function restoreOptions() {
    console.log("Restoring options from storage...");
    isInitialized = false; // Block saves during restore
    chrome.storage.sync.get([currentSetStorageKey], (result) => {
        if (chrome.runtime.lastError) {
           console.error("Error loading settings:", chrome.runtime.lastError);
           statusElement.textContent = 'Error loading settings.';
           statusElement.style.color = 'red';
           updateUIFromSettings({isEnabled: true}); // Reset UI
        } else {
           const savedSettings = result[currentSetStorageKey];
           console.log("Loaded set from storage:", savedSettings);
           updateUIFromSettings(savedSettings || {isEnabled: true}); // Update UI
        }
        // Allow saving now that restore is complete
        isInitialized = true;
        console.log("Initialization complete. Saving enabled.");
     });
}

// --- Button: Clear All Timestamps ---
function handleClearAll() {
    console.log("Clear All clicked.");
    if (confirm("Are you sure you want to clear all timestamp inputs?")) {
        const currentEnableState = enableSwitchElement ? enableSwitchElement.checked : true;
        // Update UI first
        updateUIFromSettings({isEnabled: currentEnableState, timestamps: {}, mode: 'trigger'});
        // Then save the cleared state
        if (isInitialized) saveCurrentSetToStorage();
        statusElement.textContent = 'Timestamp fields cleared.';
        statusElement.style.color = 'blue';
        setTimeout(() => { statusElement.textContent = ''; }, 2000);
    }
}

// --- Setup Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Setting up listeners (Enable/Disable + ClearAll).");
    restoreOptions(); // Load the last active set

    // Attach listeners to buttons
    document.getElementById('clear-all')?.addEventListener('click', handleClearAll);
    // Removed listeners for save-set, load-set, load-file-input

    // Attach listeners to inputs/radios/switch to save changes immediately to storage
    const inputsToSave = document.querySelectorAll('input[type="number"], input[name="mode"], #enable-switch');
    inputsToSave.forEach(input => {
        const eventType = (input.type === 'checkbox' || input.type === 'radio') ? 'change' : 'input';
        // Save function checks the isInitialized flag internally
        input.addEventListener(eventType, saveCurrentSetToStorage);
    });

    console.log("Event listeners setup complete.");
});
