const settingsStorageKey = 'youtubeSampler_currentSet';
const statusElement = document.getElementById('status');
const mainTitleElement = document.getElementById('main-title');
const enableButtonElement = document.getElementById('enable-button');
const bankButtons = document.querySelectorAll('.bank-button');
const padElements = document.querySelectorAll('.pad-grid .mpc-pad');
const displayBankElement = document.getElementById('display-bank');
const displayStatusElement = document.getElementById('display-status');
const displayModeElement = document.getElementById('display-mode');
const modeSwitchElement = document.getElementById('mode-switch-track');
const screenAreaElement = document.querySelector('.screen-area');
const clearAllButton = document.getElementById('clear-all');

const TOOLTIP_SHOW_DELAY_MS = 500;
const TOOLTIP_VERTICAL_OFFSET_PX = 25;
const tooltipElement = document.getElementById('custom-tooltip');
let tooltipShowTimer = null;
let latestMouseX = 0;
let latestMouseY = 0;

let isInitialized = false;
let currentSelectedBank = 'A';
const padFlashDuration = 300;
let padFlashTimers = {};
let currentlyHeldPadKey = null;
let stopPadFlashTimer = null;

const MAX_BANK_NAME_LENGTH = 6;
const MAX_SCREEN_BANK_NAME_LENGTH = 5;


function getDefaultBankData() {
    const timestamps = {};
    for (let i = 1; i <= 9; i++) { timestamps[i.toString()] = null; }
    return { timestamps: timestamps, mode: '1shot', name: null };
}

function getDefaultSettings() {
    return {
        isEnabled: true,
        selectedBank: 'A',
        banks: {
            'A': getDefaultBankData(), 'B': getDefaultBankData(),
            'C': getDefaultBankData(), 'D': getDefaultBankData()
        }
    };
}

function showTooltip(mouseX, mouseY, text) {
    if (!tooltipElement) return;
    tooltipElement.textContent = text;
    tooltipElement.style.display = 'block';
    tooltipElement.style.opacity = '0';
    const tooltipWidth = tooltipElement.offsetWidth;
    const tooltipHeight = tooltipElement.offsetHeight;
    const cursorOffsetY = TOOLTIP_VERTICAL_OFFSET_PX;
    const boundaryPadding = 5;
    let top = mouseY + cursorOffsetY;
    let left = mouseX - (tooltipWidth / 2);
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    if (left + tooltipWidth + boundaryPadding > windowWidth) { left = windowWidth - tooltipWidth - boundaryPadding; }
    if (left < boundaryPadding) { left = boundaryPadding; }
    if (top + tooltipHeight + boundaryPadding > windowHeight) { top = mouseY - tooltipHeight - cursorOffsetY; }
    if (top < boundaryPadding) { top = boundaryPadding; }
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
    setTimeout(() => { tooltipElement.style.opacity = '1'; }, 10);
}

function hideTooltip() {
     if (tooltipShowTimer) { clearTimeout(tooltipShowTimer); tooltipShowTimer = null; }
     if(tooltipElement){
         tooltipElement.style.opacity = '0';
         setTimeout(() => { if (tooltipElement.style.opacity === '0') { tooltipElement.style.display = 'none'; tooltipElement.textContent = ''; } }, 200);
     }
}

function sanitizeSettings(settings) {
    const sanitized = settings || getDefaultSettings();
    sanitized.isEnabled = (typeof sanitized.isEnabled === 'boolean') ? sanitized.isEnabled : true;
    sanitized.selectedBank = ['A', 'B', 'C', 'D'].includes(sanitized.selectedBank) ? sanitized.selectedBank : 'A';
    sanitized.banks = sanitized.banks || {};
    ['A', 'B', 'C', 'D'].forEach(bankId => {
        if (!sanitized.banks[bankId]) { sanitized.banks[bankId] = getDefaultBankData(); }
        else {
            sanitized.banks[bankId].timestamps = sanitized.banks[bankId].timestamps || getDefaultBankData().timestamps;
            sanitized.banks[bankId].mode = ['1shot', 'hold'].includes(sanitized.banks[bankId].mode) ? sanitized.banks[bankId].mode : '1shot';
            sanitized.banks[bankId].name = sanitized.banks[bankId].name !== undefined ? sanitized.banks[bankId].name : null;

            const defaultTimestamps = getDefaultBankData().timestamps;
            const currentTimestamps = sanitized.banks[bankId].timestamps;
            const finalTimestamps = {};
            for (let i = 1; i <= 9; i++) {
                const key = i.toString();
                const value = currentTimestamps ? currentTimestamps[key] : null;
                 if (value !== null && value !== undefined && !isNaN(parseFloat(value)) && parseFloat(value) >= 0) {
                     finalTimestamps[key] = parseFloat(parseFloat(value).toFixed(2));
                 } else {
                     finalTimestamps[key] = null;
                 }
            }
             sanitized.banks[bankId].timestamps = finalTimestamps;
        }
    });
    return sanitized;
}

function showSavedStatus() {
    if (!statusElement) return;
    if (statusElement.fadeTimeout) clearTimeout(statusElement.fadeTimeout);
    statusElement.className = 'status-message';

    statusElement.textContent = 'Saved.';
    statusElement.style.color = 'var(--status-saved)';
    statusElement.style.opacity = '1';

    statusElement.fadeTimeout = setTimeout(() => {
        if (statusElement.textContent === 'Saved.') {
           statusElement.style.opacity = '0';
           setTimeout(() => { if(statusElement.textContent === 'Saved.') statusElement.textContent = ''; }, 500);
        }
        statusElement.fadeTimeout = null;
    }, 1500);
}

function updateUIFromSettings(settings) {
    const cleanSettings = sanitizeSettings(settings);
    const selectedBank = cleanSettings.selectedBank;
    currentSelectedBank = selectedBank;
    const isEnabled = cleanSettings.isEnabled;
    const currentBankData = cleanSettings.banks[selectedBank];
    const currentMode = currentBankData.mode;
    const currentBankName = currentBankData.name;

    // Title is now static in HTML, no dynamic update needed here

    bankButtons.forEach(btn => {
        const bankId = btn.dataset.bank;
        const bankData = cleanSettings.banks[bankId];
        const defaultName = `Bank ${bankId}`;
        const displayName = bankData?.name || defaultName;
        btn.textContent = displayName;
        btn.classList.toggle('active-bank', bankId === selectedBank);
    });


    if (enableButtonElement) {
        enableButtonElement.textContent = isEnabled ? 'ON' : 'OFF';
        enableButtonElement.classList.toggle('enabled-state', isEnabled);
        enableButtonElement.classList.toggle('disabled-state', !isEnabled);
    }
    if (displayStatusElement) { displayStatusElement.textContent = isEnabled ? 'ON' : 'OFF'; }

    if (displayBankElement) {
        if (currentBankName) {
            displayBankElement.textContent = currentBankName.toUpperCase().slice(0, MAX_SCREEN_BANK_NAME_LENGTH);
        } else {
            displayBankElement.textContent = selectedBank;
        }
    }
    if (displayModeElement) { displayModeElement.textContent = currentMode.toUpperCase(); }
    if (modeSwitchElement) { modeSwitchElement.dataset.mode = currentMode; }
    if (screenAreaElement) { screenAreaElement.classList.toggle('screen-hold-mode', currentMode === 'hold'); }


    const timestampsData = currentBankData.timestamps;
    padElements.forEach(padDiv => {
        const key = padDiv.dataset.key;
        const inputElement = padDiv.querySelector('.pad-input');
        if (key !== undefined && inputElement) {
            const time = timestampsData[key];
            const hasCue = (time !== null && time !== undefined && !isNaN(time));
            inputElement.value = hasCue ? parseFloat(time).toFixed(2) : '';
            padDiv.classList.toggle('has-cue', hasCue);
            padDiv.classList.remove('pad-triggered-1shot', 'pad-triggered-hold');
        }
    });
    document.getElementById('pad-0')?.classList.remove('stop-pad-triggered');
    currentlyHeldPadKey = null;
    console.log("[Options UI] Updated UI. Displaying Bank:", selectedBank, "Mode:", currentMode);
}


async function saveBankName(bankId, newName) {
      console.log(`Attempting to save name for Bank ${bankId}: "${newName}"`);
      const nameToSave = (newName === null || newName.trim() === '') ? null : newName.trim().slice(0, MAX_BANK_NAME_LENGTH);

      try {
          chrome.storage.local.get([settingsStorageKey], (result) => {
              if (chrome.runtime.lastError) { throw new Error(chrome.runtime.lastError); }
              const settingsToSave = sanitizeSettings(result[settingsStorageKey]);
              settingsToSave.banks[bankId].name = nameToSave;

              chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => {
                  if (chrome.runtime.lastError) { throw new Error(chrome.runtime.lastError); }
                  console.log(`Bank ${bankId} name saved as:`, nameToSave);
                  // showSavedStatus(); // Let saveSettingsToStorage handle feedback
              });
          });
       } catch (error) {
           console.error(`Error saving name for Bank ${bankId}:`, error);
           statusElement.textContent = 'Error saving bank name!'; statusElement.style.color = 'red'; statusElement.style.opacity = '1';
       }
}


function saveSettingsToStorage(specificUpdate = null, forceIsEnabledState = null) {
    if (!isInitialized && !specificUpdate && forceIsEnabledState === null) {
         console.log("Save attempt blocked: not initialized and not specific update.");
         return;
    }

    const currentIsEnabled = (forceIsEnabledState !== null) ? forceIsEnabledState : (enableButtonElement?.classList.contains('enabled-state') ?? true);
    const currentMode = modeSwitchElement?.dataset.mode || '1shot';
    const bankToUpdate = currentSelectedBank;

    chrome.storage.local.get([settingsStorageKey], (result) => {
        if (chrome.runtime.lastError) { console.error("[Options Save] Read Error:", chrome.runtime.lastError); return; }
        const settingsToSave = sanitizeSettings(result[settingsStorageKey]);

        let requiresSave = false;

        if (specificUpdate && specificUpdate.key !== undefined && specificUpdate.key !== null && specificUpdate.key !== '0') {
             settingsToSave.banks[bankToUpdate].timestamps = settingsToSave.banks[bankToUpdate].timestamps || {};
             let finalValue = null;
             if(specificUpdate.value !== null && specificUpdate.value !== '' && !isNaN(parseFloat(specificUpdate.value)) && parseFloat(specificUpdate.value) >= 0){ finalValue = parseFloat(parseFloat(specificUpdate.value).toFixed(2)); }
             else { finalValue = null; }
             if(settingsToSave.banks[bankToUpdate].timestamps[specificUpdate.key] !== finalValue) {
                settingsToSave.banks[bankToUpdate].timestamps[specificUpdate.key] = finalValue;
                requiresSave = true;
             }
        } else {
            requiresSave = true; // Assume non-specific updates always require save check
        }


        if (settingsToSave.isEnabled !== currentIsEnabled) {
            settingsToSave.isEnabled = currentIsEnabled;
            requiresSave = true;
        }
         if (settingsToSave.selectedBank !== bankToUpdate) {
            settingsToSave.selectedBank = bankToUpdate;
            requiresSave = true;
        }
         if (!settingsToSave.banks[bankToUpdate] || settingsToSave.banks[bankToUpdate].mode !== currentMode) {
             if(!settingsToSave.banks[bankToUpdate]) settingsToSave.banks[bankToUpdate] = getDefaultBankData(); // Should be handled by sanitize but belt-and-suspenders
             settingsToSave.banks[bankToUpdate].mode = currentMode;
             requiresSave = true;
         }

        if (!requiresSave && !(specificUpdate && specificUpdate.key !== undefined)) {
             console.log("[Options Save] No changes detected, skipping save.");
             return;
        }

        chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => {
             if (chrome.runtime.lastError) {
                 console.error("[Options Save] SAVE FAILED:", chrome.runtime.lastError);
                 statusElement.textContent = 'Error saving settings!';
                 statusElement.style.color = 'red';
                 statusElement.style.opacity = '1';
             } else {
                 console.log("[Options Save] Settings saved successfully via saveSettingsToStorage.");
                 if (isInitialized) {
                      showSavedStatus();
                 }
             }
        });
    });
}


function restoreOptions() {
    isInitialized = false;
    console.log("[Options Restore] Restoring options...");
    chrome.storage.local.get([settingsStorageKey], (result) => {
        let settingsToUse;
        if (chrome.runtime.lastError) { console.error("Error loading settings:", chrome.runtime.lastError); statusElement.textContent = 'Error loading settings. Using defaults.'; settingsToUse = getDefaultSettings(); }
        else {
           const loadedSettings = result[settingsStorageKey];
           settingsToUse = sanitizeSettings(loadedSettings);
           if (!loadedSettings || !loadedSettings.banks || !loadedSettings.selectedBank || !loadedSettings.isEnabled) {
                statusElement.textContent = 'Initializing default settings...'; statusElement.style.color = 'orange'; statusElement.style.opacity = '1';
                chrome.storage.local.set({ [settingsStorageKey]: settingsToUse }, () => {
                    isInitialized = true; // Set initialized here after potential save
                    if (!chrome.runtime.lastError) { console.log("Saved initial default structure."); setTimeout(() => { if(statusElement.textContent.startsWith('Initializing')) { statusElement.textContent = ''; statusElement.style.opacity = '0'; } }, 2000); }
                    else { console.error("Failed to save initial defaults:", chrome.runtime.lastError); }
                });
           } else {
               isInitialized = true; // Set initialized if settings loaded ok
           }
        }
        updateUIFromSettings(settingsToUse);
        console.log("[Options Restore] Restore complete. Initialized state:", isInitialized);
     });
}

function handleBankChange(event) {
    const newBank = event.currentTarget.dataset.bank;
    if (!isInitialized || !newBank || newBank === currentSelectedBank) { return; }
    currentSelectedBank = newBank;

    chrome.storage.local.get([settingsStorageKey], (result) => {
        const settings = sanitizeSettings(result[settingsStorageKey]);
        settings.selectedBank = newBank;
        updateUIFromSettings(settings);
        saveSettingsToStorage(); // This will now trigger showSavedStatus on success
    });
}

function handleClearAll() {
    if (!isInitialized) return;
    if (confirm(`Clear ALL timestamps AND reset name for Bank ${currentSelectedBank}?`)) {
         chrome.storage.local.get([settingsStorageKey], (result) => {
             if (chrome.runtime.lastError) { console.error("ClearAll Error: Get failed", chrome.runtime.lastError); statusElement.textContent = 'Error reading settings.'; statusElement.style.color = 'red'; statusElement.style.opacity = '1'; return; }
             const settingsToSave = sanitizeSettings(result[settingsStorageKey]);

             let changed = false;
             if(settingsToSave.banks[currentSelectedBank]) {
                if(Object.values(settingsToSave.banks[currentSelectedBank].timestamps || {}).some(ts => ts !== null)) {
                    settingsToSave.banks[currentSelectedBank].timestamps = getDefaultBankData().timestamps;
                    changed = true;
                }
                if(settingsToSave.banks[currentSelectedBank].name !== null) {
                    settingsToSave.banks[currentSelectedBank].name = null;
                    changed = true;
                }
             }

             if (!changed) {
                 console.log(`[Options Clear] Bank ${currentSelectedBank} already empty.`);
                 statusElement.textContent = `Bank ${currentSelectedBank} already empty.`;
                 statusElement.style.color = 'var(--status-info)'; statusElement.style.opacity = '1';
                 setTimeout(() => { if (statusElement.textContent.includes('already empty')) { statusElement.textContent = ''; statusElement.style.opacity = '0';} }, 2000);
                 return; // Don't save if nothing changed
             }

             settingsToSave.selectedBank = currentSelectedBank;
             settingsToSave.isEnabled = enableButtonElement?.classList.contains('enabled-state') ?? true;
             chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => {
                 if (chrome.runtime.lastError) { console.error("ClearAll Error: Set failed", chrome.runtime.lastError); statusElement.textContent = `Error clearing Bank ${currentSelectedBank}.`; statusElement.style.color = 'red'; statusElement.style.opacity = '1'; }
                 else {
                     console.log(`[Options Clear] Bank ${currentSelectedBank} timestamps cleared and name reset.`);
                     // Let storage.onChanged update UI, and saveSettingsToStorage handle "Saved." feedback implicitly
                     showSavedStatus(); // Explicitly show saved here is fine too for immediate feedback
                 }
             });
         });
    }
}


function handleEnableToggle() {
    if (!isInitialized || !enableButtonElement) return;
    const currentIsEnabled = enableButtonElement.classList.contains('enabled-state');
    const newState = !currentIsEnabled;
    console.log(`[Options Enable Toggle] Button clicked. Intending to set state to: ${newState}`);
    saveSettingsToStorage(null, newState); // This will now trigger showSavedStatus on success
}

function handlePadInputChange(event) {
    if (!isInitialized) return;
    const inputElement = event.target; const key = inputElement.dataset.key; let value = inputElement.value;
    if (!key || key === '0') return; let finalValue = null;
    if (value !== '') { const num = parseFloat(value); if (!isNaN(num) && num >= 0) { finalValue = num; } else { console.warn(`Invalid input for Pad ${key}: ${value}.`); } }
    saveSettingsToStorage({ key: key, value: finalValue }); // This will now trigger showSavedStatus on success
}

function handlePadInputKeyDown(event) {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const inputElement = event.target;
    if (!inputElement.matches('.pad-input')) return;
     if (!isInitialized) return;

    event.preventDefault();
    const key = inputElement.dataset.key;
    const delta = event.key === 'ArrowUp' ? 0.01 : -0.01;
    let currentValue = parseFloat(inputElement.value);
    if (isNaN(currentValue)) { currentValue = 0; }
    let newValue = Math.max(0, currentValue + delta);
    newValue = parseFloat(newValue.toFixed(2));
    inputElement.value = newValue.toFixed(2);

    saveSettingsToStorage({ key: key, value: newValue }); // This will now trigger showSavedStatus on success
}


function handlePadAdjustClick(event) {
     if (!isInitialized) return;
    const button = event.target.closest('.pad-adjust'); if (!button) return;
    const key = button.dataset.key; const delta = parseFloat(button.dataset.delta); const padElement = button.closest('.mpc-pad'); const inputElement = padElement?.querySelector(`.pad-input[data-key="${key}"]`);
    if (!inputElement || isNaN(delta)) return; let currentValue = parseFloat(inputElement.value); if (isNaN(currentValue)) { currentValue = 0; }
    let newValue = Math.max(0, currentValue + delta); newValue = parseFloat(newValue.toFixed(2)); inputElement.value = newValue.toFixed(2);
    saveSettingsToStorage({ key: key, value: newValue }); // This will now trigger showSavedStatus on success
}

function handlePadClearClick(event) {
     if (!isInitialized) return;
    const button = event.target.closest('.pad-clear-button'); if (!button) return;
    const key = button.dataset.key; const padElement = button.closest('.mpc-pad'); const inputElement = padElement?.querySelector(`.pad-input[data-key="${key}"]`);
    if (!inputElement) return;
    if (inputElement.value === '') return; // Don't save if already empty
    inputElement.value = '';
    saveSettingsToStorage({ key: key, value: null }); // This will now trigger showSavedStatus on success
}

function handleModeSwitchClick(event) {
    if (!isInitialized) return;
    const track = event.currentTarget; const currentMode = track.dataset.mode; const newMode = (currentMode === '1shot') ? 'hold' : '1shot';
    track.dataset.mode = newMode; if (displayModeElement) { displayModeElement.textContent = newMode.toUpperCase(); } if (screenAreaElement) { screenAreaElement.classList.toggle('screen-hold-mode', newMode === 'hold'); }
    saveSettingsToStorage(); // This will now trigger showSavedStatus on success
}


let currentEditingBankBtn = null;

async function handleBankNameEdit(event) {
     if (!isInitialized) return;
    if (currentEditingBankBtn && currentEditingBankBtn !== event.currentTarget) {
        currentEditingBankBtn.blur();
    }
    currentEditingBankBtn = event.currentTarget;
    const button = event.currentTarget;
    const bankId = button.dataset.bank;


    const settingsResult = await chrome.storage.local.get([settingsStorageKey]);
    const settings = sanitizeSettings(settingsResult[settingsStorageKey]);
    const currentCustomName = settings.banks[bankId]?.name || '';


    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'temp-bank-name-input';
    input.value = currentCustomName;
    input.maxLength = MAX_BANK_NAME_LENGTH;
    input.spellcheck = false;
    input.dataset.bankId = bankId;
    input.dataset.defaultName = `Bank ${bankId}`;


    const btnRect = button.getBoundingClientRect();
    const containerRect = button.parentElement.getBoundingClientRect();
    input.style.position = 'absolute';
    input.style.top = `${button.offsetTop}px`;
    input.style.left = `${button.offsetLeft}px`;
    input.style.width = `${btnRect.width}px`;
    input.style.height = `${btnRect.height}px`;

    input.style.fontSize = getComputedStyle(button).fontSize;
    input.style.fontWeight = getComputedStyle(button).fontWeight;
    input.style.textAlign = 'center';


    button.style.visibility = 'hidden';
    button.parentElement.appendChild(input);
    input.focus();
    input.select();


    input.addEventListener('blur', handleBankNameBlur, { once: true });
    input.addEventListener('keydown', handleBankNameKeyDown);
}

function handleBankNameKeyDown(event) {
    const input = event.currentTarget;
    if (event.key === 'Enter') {
        event.preventDefault();
        input.blur();
    } else if (event.key === 'Escape') {

        input.value = 'ESCAPE_TRIGGERED';
        input.blur();
    }
}

function handleBankNameBlur(event) {
    const input = event.currentTarget;
    const bankId = input.dataset.bankId;
    const defaultName = input.dataset.defaultName;
    const originalButton = document.getElementById(`bank-btn-${bankId.toLowerCase()}`);

    if (!originalButton) return;

    const finalValue = input.value.trim();


    input.remove();
    originalButton.style.visibility = 'visible';
    currentEditingBankBtn = null;


    if (finalValue === 'ESCAPE_TRIGGERED') {
        console.log(`Bank ${bankId} name edit cancelled.`);

        return;
    }


    const nameToSave = (finalValue === '') ? null : finalValue.slice(0, MAX_BANK_NAME_LENGTH);


    originalButton.textContent = nameToSave || defaultName;


    saveBankName(bankId, nameToSave); // This function now handles saving via storage.set, which triggers save feedback
}


async function handleSaveBank() {
    if (!isInitialized) return;
    const bankId = currentSelectedBank;

    try {
        const result = await chrome.storage.local.get([settingsStorageKey]);
        const settings = sanitizeSettings(result[settingsStorageKey]);
        const bankData = settings.banks[bankId];

        if (!bankData) {
            throw new Error(`Bank data for ${bankId} not found.`);
        }

        const dataToSave = {
            type: "youtubeSamplerBankData",
            version: "1.0",
            name: bankData.name || null,
            mode: bankData.mode || '1shot',
            timestamps: bankData.timestamps || getDefaultBankData().timestamps
        };

        const jsonData = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;

        const customNamePart = bankData.name ? bankData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : `bank_${bankId}`;
        link.download = `youtube_mpc_${customNamePart}.json`; // Corrected filename

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        statusElement.textContent = `Bank ${bankId} data prepared for download.`; // Changed feedback slightly
        statusElement.style.color = 'var(--status-info)'; statusElement.style.opacity = '1';
        setTimeout(() => { if (statusElement.textContent.includes('prepared for download')) { statusElement.textContent = ''; statusElement.style.opacity = '0';} }, 2000);


    } catch (error) {
        console.error(`[Options Save Bank Error]`, error);
        statusElement.textContent = 'Error saving bank!';
        statusElement.style.color = 'red'; statusElement.style.opacity = '1';
    }
}


function handleLoadBank() {
    if (!isInitialized) return;
    const bankId = currentSelectedBank;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            let loadedData;
            try {
                loadedData = JSON.parse(e.target.result);

                if (!loadedData || loadedData.type !== "youtubeSamplerBankData") {
                    throw new Error("Invalid or incompatible file format.");
                }
                if (typeof loadedData.name === 'undefined' || typeof loadedData.mode === 'undefined' || typeof loadedData.timestamps === 'undefined') {
                    throw new Error("File is missing required bank data (name, mode, timestamps).");
                }
                if (!['1shot', 'hold'].includes(loadedData.mode)) {
                    throw new Error(`Invalid mode found in file: ${loadedData.mode}`);
                }


                const result = await chrome.storage.local.get([settingsStorageKey]);
                const settingsToSave = sanitizeSettings(result[settingsStorageKey]);


                settingsToSave.banks[bankId] = {
                    name: loadedData.name !== undefined ? String(loadedData.name || '').slice(0, MAX_BANK_NAME_LENGTH) : null,
                    mode: loadedData.mode,
                    timestamps: loadedData.timestamps
                };


                settingsToSave.banks[bankId] = sanitizeSettings({isEnabled: true, selectedBank: bankId, banks:{[bankId]: settingsToSave.banks[bankId]}}).banks[bankId];


                await chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }); // This save will trigger the onChanged listener which updates UI

                console.log(`[Options Load Bank] Bank ${bankId} loaded successfully from ${file.name}`);
                // showSavedStatus(); // Let the onChanged listener handle UI update, feedback provided below
                statusElement.textContent = `Bank ${bankId} loaded from ${file.name}.`; // Provide specific load feedback
                statusElement.style.color = 'green'; statusElement.style.opacity = '1';
                setTimeout(() => { if (statusElement.textContent.includes('loaded from')) { statusElement.textContent = ''; statusElement.style.opacity = '0';} }, 2500);


            } catch (error) {
                console.error(`[Options Load Bank Error]`, error);
                statusElement.textContent = `Error loading bank: ${error.message}`;
                statusElement.style.color = 'red'; statusElement.style.opacity = '1';
            }
        };

        reader.onerror = (e) => {
            console.error(`[Options Load Bank File Read Error]`, e);
            statusElement.textContent = 'Error reading file!';
            statusElement.style.color = 'red'; statusElement.style.opacity = '1';
        };

        reader.readAsText(file);
    };

    input.click();
}


document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    document.addEventListener('mousemove', (event) => { latestMouseX = event.clientX; latestMouseY = event.clientY; });
    clearAllButton?.addEventListener('click', handleClearAll);
    enableButtonElement?.addEventListener('click', handleEnableToggle);

    bankButtons.forEach(button => {
        button.addEventListener('click', handleBankChange);
        button.addEventListener('dblclick', handleBankNameEdit);
    });

    modeSwitchElement?.addEventListener('click', handleModeSwitchClick);
    const tooltipTriggerContainer = document.querySelector('.mpc-container');
    if (tooltipTriggerContainer && tooltipElement) {
         tooltipTriggerContainer.addEventListener('mouseover', (event) => { const target = event.target.closest('[data-tooltip]'); if (target) { const tooltipText = target.dataset.tooltip; if (tooltipText) { if (tooltipShowTimer) clearTimeout(tooltipShowTimer); tooltipShowTimer = setTimeout(() => { showTooltip(latestMouseX, latestMouseY, tooltipText); tooltipShowTimer = null; }, TOOLTIP_SHOW_DELAY_MS); } } });
         tooltipTriggerContainer.addEventListener('mouseout', (event) => { const target = event.target.closest('[data-tooltip]'); if (target) { if (tooltipShowTimer) { clearTimeout(tooltipShowTimer); tooltipShowTimer = null; } hideTooltip(); } });
         document.addEventListener('click', (event) => { if (!event.target.closest('[data-tooltip]') && tooltipElement.style.display === 'block') { hideTooltip(); } });
    }
    const padArea = document.querySelector('.pad-area');
    if (padArea) {
        padArea.addEventListener('change', (event) => { if (event.target.matches('.pad-input')) { handlePadInputChange(event); } });
        padArea.addEventListener('click', (event) => { const clearButton = event.target.closest('.pad-clear-button'); const adjustButton = event.target.closest('.pad-adjust'); if (clearButton) { handlePadClearClick(event); } else if (adjustButton) { handlePadAdjustClick(event); } });
        padArea.addEventListener('keydown', (event) => { if (event.target.matches('.pad-input')) { handlePadInputKeyDown(event); } });
    }

    document.getElementById('save-bank')?.addEventListener('click', handleSaveBank);
    document.getElementById('load-bank')?.addEventListener('click', handleLoadBank);

});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[settingsStorageKey]) {
        console.log('[Options storage.onChanged] Detected external change in settings.');
        const newSettings = changes[settingsStorageKey].newValue;
        if (newSettings) { updateUIFromSettings(sanitizeSettings(newSettings)); }
        else { console.warn("[Options storage.onChanged] Settings cleared externally."); updateUIFromSettings(getDefaultSettings()); }
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'padTriggered' && message.mode === '1shot') {
        const padElement = document.getElementById(`pad-${message.key}`);
        if (padElement) {
            const className = 'pad-triggered-1shot';
            if (padFlashTimers[message.key]) clearTimeout(padFlashTimers[message.key]);
            padElement.classList.remove('pad-triggered-hold');
            padElement.classList.add(className);
            padFlashTimers[message.key] = setTimeout(() => { padElement.classList.remove(className); delete padFlashTimers[message.key]; }, padFlashDuration);
        }
    }
    else if (message.action === 'padHoldStart') {
         const newKey = message.key;
         const newPadElement = document.getElementById(`pad-${newKey}`);
         if (currentlyHeldPadKey && currentlyHeldPadKey !== newKey) {
             const oldPadElement = document.getElementById(`pad-${currentlyHeldPadKey}`);
             oldPadElement?.classList.remove('pad-triggered-hold');
         }
         if (newPadElement) {
             newPadElement.classList.remove('pad-triggered-1shot');
             newPadElement.classList.add('pad-triggered-hold');
             currentlyHeldPadKey = newKey;
         }
    }
    else if (message.action === 'padHoldEnd') {
         const releasedKey = message.key;
         if (releasedKey === currentlyHeldPadKey) {
             const padElement = document.getElementById(`pad-${releasedKey}`);
             padElement?.classList.remove('pad-triggered-hold');
             currentlyHeldPadKey = null;
         }
    }
    else if (message.action === 'stopPadTriggered') {
        const stopPadElement = document.getElementById('pad-0');
        if (stopPadElement) {
            const className = 'stop-pad-triggered';
            if (stopPadFlashTimer) { clearTimeout(stopPadFlashTimer); }
            stopPadElement.classList.add(className);
            stopPadFlashTimer = setTimeout(() => { stopPadElement.classList.remove(className); stopPadFlashTimer = null; }, padFlashDuration);
        }
    }
});
