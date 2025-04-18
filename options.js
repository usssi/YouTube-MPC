// options.js (Bank Switching - Uses chrome.storage.local - COMPLETE)

const settingsStorageKey = 'youtubeSampler_currentSet'; // Key for storage (now local)
const statusElement = document.getElementById('status');
const enableSwitchElement = document.getElementById('enable-switch');
const bankRadioButtons = document.querySelectorAll('input[name="bank"]');

let isInitialized = false; // Initialization Flag
let currentSelectedBank = 'A'; // Tracks the currently selected bank in the UI

console.log("Options script loaded (Using Local Storage).");

// --- Helper function to get default structure for a single bank ---
function getDefaultBankData() {
    const timestamps = {};
    for (let i = 0; i <= 9; i++) { timestamps[i.toString()] = null; }
    return { timestamps: timestamps, mode: 'trigger' }; // Include default mode
}

// --- Helper function to get default structure for ALL settings ---
function getDefaultSettings() {
    const defaultSettings = {
        isEnabled: true,
        selectedBank: 'A',
        banks: {
            'A': getDefaultBankData(),
            'B': getDefaultBankData(),
            'C': getDefaultBankData(),
            'D': getDefaultBankData()
        }
    };
    return defaultSettings;
}


// --- Helper function to read current UI state for Timestamps & Mode ---
function getCurrentUITimestampModeData() {
    const timestamps = {};
    for (let i = 0; i <= 9; i++) {
        const inputElement = document.getElementById(`key${i}`);
        if (inputElement) {
             const value = inputElement.value;
             if (value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0) {
                 timestamps[i.toString()] = parseFloat(value);
             } else {
                 timestamps[i.toString()] = null;
             }
        } else {
             console.warn(`Input element key${i} not found when reading UI.`);
             timestamps[i.toString()] = null;
        }
    }

    let selectedMode = 'trigger';
    const modeChecked = document.querySelector('input[name="mode"]:checked');
    if (modeChecked) {
        selectedMode = modeChecked.value;
    }
    return { timestamps: timestamps, mode: selectedMode };
}

// --- Helper function to update UI (Inputs and Mode radio) from specific bank data ---
function updateUIInputsFromBankData(bankData) {
    const timestampsData = bankData?.timestamps || {};
    const modeData = bankData?.mode || 'trigger';
    console.log("Updating UI inputs from bank data:", bankData);

    // Update timestamp inputs
    for (let i = 0; i <= 9; i++) {
        const inputElement = document.getElementById(`key${i}`);
        if (inputElement) {
            const savedTime = timestampsData[i.toString()];
            // Ensure null/undefined results in empty string
            inputElement.value = (savedTime !== undefined && savedTime !== null) ? savedTime : '';
        }
    }
    // Update mode radio button
    const modeRadioButton = document.getElementById(`mode-${modeData}`);
    if (modeRadioButton) {
        modeRadioButton.checked = true;
    } else {
        // Fallback if mode value is invalid, check 'trigger'
        const triggerRadio = document.getElementById('mode-trigger');
        if(triggerRadio) triggerRadio.checked = true;
    }
}

// --- MAIN SAVE FUNCTION: Reads storage, updates current bank, saves all ---
function saveSettingsToStorage() {
    if (!isInitialized) {
        console.log("Skipping save: Not initialized yet.");
        return;
    }
    console.log(`saveSettingsToStorage called. Target bank: ${currentSelectedBank}`);

    // 1. Get current global enable state directly from switch
    const currentIsEnabled = enableSwitchElement ? enableSwitchElement.checked : true;
    // 2. Get current timestamp/mode data directly from inputs/radios
    const currentBankUIData = getCurrentUITimestampModeData();

    // 3. Read the LATEST full settings object from LOCAL storage
    console.log("[Options Save] Reading current settings from LOCAL storage before write...");
    chrome.storage.local.get([settingsStorageKey], (result) => { // *** Using local ***
        if (chrome.runtime.lastError) {
            console.error("[Options Save] Error: Failed to read settings before write:", chrome.runtime.lastError);
            statusElement.textContent = 'Error preparing save!';
            statusElement.style.color = 'red';
            return;
        }
        // Start with loaded data or a fresh default structure
        const settingsToSave = result[settingsStorageKey] || getDefaultSettings();
        console.log("[Options Save] Read settings from storage:", settingsToSave);


        // --- Ensure structure is the new one ---
        settingsToSave.banks = settingsToSave.banks || {}; // Ensure banks object exists
        settingsToSave.banks[currentSelectedBank] = settingsToSave.banks[currentSelectedBank] || getDefaultBankData(); // Ensure object for current bank exists
        settingsToSave.selectedBank = settingsToSave.selectedBank || 'A'; // Ensure selectedBank exists
        settingsToSave.isEnabled = (typeof settingsToSave.isEnabled === 'boolean') ? settingsToSave.isEnabled : true; // Ensure isEnabled exists
        // ---

        // 4. Update ONLY the data for the currently selected bank with data from UI inputs
        console.log(`[Options Save] Updating bank '${currentSelectedBank}' data with UI data:`, currentBankUIData);
        settingsToSave.banks[currentSelectedBank] = currentBankUIData; // Replace timestamps/mode for this bank

        // 5. Update global settings
        console.log(`[Options Save] Setting global 'isEnabled' to: ${currentIsEnabled}`);
        settingsToSave.isEnabled = currentIsEnabled;
        console.log(`[Options Save] Setting global 'selectedBank' to: ${currentSelectedBank}`);
        settingsToSave.selectedBank = currentSelectedBank; // Record which bank is selected

        console.log("[Options Save Check] Final object being saved:", JSON.stringify(settingsToSave, null, 2));

        // 6. Save the entire modified object back to LOCAL storage
        chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => { // *** Using local ***
             if (chrome.runtime.lastError) {
                console.error("[Options Save] SAVE FAILED:", chrome.runtime.lastError);
                statusElement.textContent = 'Error saving settings!';
                statusElement.style.color = 'red';
            } else {
                console.log("[Options Save] Save successful.");
                statusElement.textContent = 'Saved.';
                statusElement.style.color = 'green';
                statusElement.style.opacity = '1';
                setTimeout(() => {
                    if (statusElement.textContent === 'Saved.') {
                        statusElement.style.opacity = '0';
                    }
                }, 1500);
            }
        });
    });
}


// --- Restore Options from Storage on Load ---
function restoreOptions() {
    console.log("Restoring options from LOCAL storage...");
    isInitialized = false; // Block saves during restore
    // *** CHANGED TO local ***
    chrome.storage.local.get([settingsStorageKey], (result) => {
        let settingsToUse; // This will hold the settings object we decide to use

        if (chrome.runtime.lastError) {
           console.error("Error loading settings:", chrome.runtime.lastError);
           statusElement.textContent = 'Error loading settings. Using defaults.';
           statusElement.style.color = 'red';
           settingsToUse = getDefaultSettings(); // Use fresh defaults on error
        } else {
           const loadedSettings = result[settingsStorageKey];
           console.log("Loaded settings from storage:", loadedSettings);

           // --- Structure Check ---
           if (loadedSettings && typeof loadedSettings.banks === 'object' && typeof loadedSettings.selectedBank === 'string') {
               console.log("Detected NEW settings structure. Using loaded data.");
               settingsToUse = loadedSettings;
               // Ensure defaults for missing parts just in case
               settingsToUse.banks = settingsToUse.banks || {};
               settingsToUse.isEnabled = (typeof settingsToUse.isEnabled === 'boolean') ? settingsToUse.isEnabled : true;
               settingsToUse.selectedBank = settingsToUse.selectedBank || 'A';
           } else {
               console.warn("Detected OLD or INVALID settings structure. Resetting to default structure.");
               statusElement.textContent = 'Old/missing settings format. Initializing fresh state.';
               statusElement.style.color = 'orange';
               settingsToUse = getDefaultSettings(); // Use fresh defaults if structure is wrong

               // IMPORTANT: Save the new default structure immediately to LOCAL storage
               console.log("Saving new default structure back to LOCAL storage...");
                // *** CHANGED TO local ***
               chrome.storage.local.set({ [settingsStorageKey]: settingsToUse }, () => {
                   if (chrome.runtime.lastError) console.error("Failed to save initial default structure:", chrome.runtime.lastError);
                   else console.log("Successfully saved initial default structure.");
                   // Clear the warning message after a delay
                    setTimeout(() => { if(statusElement.textContent.startsWith('Old/missing')) statusElement.textContent = ''; }, 3000);
               });
           }
           // --- End Structure Check ---
        }

        // Now proceed using settingsToUse
        currentSelectedBank = settingsToUse.selectedBank;
        console.log(`Using selected bank: ${currentSelectedBank}`);

        // Update the UI based on settingsToUse
        // 1. Set Enable Switch
        if (enableSwitchElement) {
            enableSwitchElement.checked = settingsToUse.isEnabled;
        }
        // 2. Set Bank Radio Button
        const bankRadioButton = document.getElementById(`bank-${currentSelectedBank.toLowerCase()}`);
        if (bankRadioButton) {
            bankRadioButton.checked = true;
            console.log(`Set radio button for bank ${currentSelectedBank} to checked.`);
        } else {
            console.warn(`Could not find radio button for bank ${currentSelectedBank}. Defaulting to A.`);
             document.getElementById('bank-a')?.setAttribute('checked', true); // Fallback
        }
        // 3. Update Timestamp/Mode Inputs using data for the selected bank
        const bankDataForUI = settingsToUse.banks[currentSelectedBank] || getDefaultBankData();
        updateUIInputsFromBankData(bankDataForUI);

        // Allow saving now
        isInitialized = true;
        console.log("Initialization complete. Saving enabled.");
     });
}

// --- Handle Bank Selection Change ---
function handleBankChange(event) {
    const newBank = event.target.value;
    if (!isInitialized || newBank === currentSelectedBank) {
        console.log(`Bank change to ${newBank} ignored (not initialized or same bank).`);
        return;
    }

    console.log(`[Options Bank Change] UI radio button changed to: ${newBank}`);
    currentSelectedBank = newBank; // Update the internally tracked selected bank
    console.log(`[Options Bank Change] currentSelectedBank variable is now: ${currentSelectedBank}.`);

    // Read storage to get the data for the new bank and update UI
    console.log(`[Options Bank Change] Reading LOCAL storage to update UI for bank ${currentSelectedBank}...`);
     // *** CHANGED TO local ***
    chrome.storage.local.get([settingsStorageKey], (result) => {
        let currentBankData = {};
         if (chrome.runtime.lastError) {
            console.error("[Options Bank Change] Error loading settings on bank change:", chrome.runtime.lastError);
            statusElement.textContent = 'Error loading bank data!';
            statusElement.style.color = 'red';
            currentBankData = getDefaultBankData(); // Use default empty data on error
         } else {
            const loadedSettings = result[settingsStorageKey] || { banks: {} };
            loadedSettings.banks = loadedSettings.banks || {};
            currentBankData = loadedSettings.banks[currentSelectedBank] || getDefaultBankData();
            console.log(`[Options Bank Change] Loaded data for bank ${currentSelectedBank}:`, currentBankData);
         }
         // Update the number/mode inputs to reflect the newly selected bank's data
         updateUIInputsFromBankData(currentBankData);

         // IMPORTANT: Also save the change in *which bank is selected* back to storage
         console.log(`[Options Bank Change] Triggering save to persist selected bank ${currentSelectedBank}...`);
         saveSettingsToStorage(); // This will save using local storage
    });
}

// --- Button: Clear Selected Bank Timestamps ---
function handleClearAll() {
    if (!isInitialized) return;
    console.log(`Clear All clicked for bank: ${currentSelectedBank}`);
    if (confirm(`Are you sure you want to clear timestamps for Bank ${currentSelectedBank}?`)) {
        // Update UI with empty timestamps (using default bank data)
        updateUIInputsFromBankData(getDefaultBankData());
        // Call save - this reads storage, merges the cleared data for current bank, and saves all
        saveSettingsToStorage(); // This will save using local storage
        statusElement.textContent = `Timestamps for Bank ${currentSelectedBank} cleared.`;
        statusElement.style.color = 'blue';
        setTimeout(() => { statusElement.textContent = ''; }, 2000);
    }
}


// --- Setup Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Setting up listeners (Using Local Storage).");
    restoreOptions(); // Load the last active set & bank

    // Attach listeners to buttons
    document.getElementById('clear-all')?.addEventListener('click', handleClearAll);

    // Attach listeners to inputs/switch to trigger save
    const inputsToSave = document.querySelectorAll('input[type="number"], #enable-switch');
    inputsToSave.forEach(input => {
        const eventType = (input.type === 'checkbox') ? 'change' : 'input';
        input.addEventListener(eventType, saveSettingsToStorage); // Saves the whole settings object
    });
     // Attach listeners to mode radios (if they become visible/used again)
     document.querySelectorAll('input[name="mode"]').forEach(radio => {
         radio.addEventListener('change', saveSettingsToStorage);
     });

    // Attach listeners to BANK radio buttons
    console.log("Attaching listeners to bank radio buttons...");
    bankRadioButtons.forEach(radio => {
        radio.addEventListener('change', handleBankChange);
    });

    console.log("Event listeners setup complete.");
});
