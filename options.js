const settingsStorageKey = 'youtubeSampler_currentSet';
const statusElement = document.getElementById('status');
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

function getDefaultBankData() {
    const timestamps = {};
    for (let i = 1; i <= 9; i++) { timestamps[i.toString()] = null; }
    return { timestamps: timestamps, mode: '1shot' };
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
    sanitized.selectedBank = sanitized.selectedBank || 'A';
    sanitized.banks = sanitized.banks || {};
    ['A', 'B', 'C', 'D'].forEach(bankId => {
        if (!sanitized.banks[bankId]) { sanitized.banks[bankId] = getDefaultBankData(); }
        else {
            sanitized.banks[bankId].timestamps = sanitized.banks[bankId].timestamps || getDefaultBankData().timestamps;
            sanitized.banks[bankId].mode = sanitized.banks[bankId].mode || getDefaultBankData().mode;
            delete sanitized.banks[bankId].timestamps['0'];
        }
    });
    return sanitized;
}

function updateUIFromSettings(settings) {
    const cleanSettings = sanitizeSettings(settings);
    const selectedBank = cleanSettings.selectedBank;
    currentSelectedBank = selectedBank;
    const currentBankData = cleanSettings.banks[selectedBank];
    const isEnabled = cleanSettings.isEnabled;
    const currentMode = currentBankData.mode;

    if (enableButtonElement) {
        enableButtonElement.textContent = isEnabled ? 'ON' : 'OFF';
        enableButtonElement.classList.toggle('enabled-state', isEnabled);
        enableButtonElement.classList.toggle('disabled-state', !isEnabled);
    }
    if (displayStatusElement) { displayStatusElement.textContent = isEnabled ? 'ON' : 'OFF'; }
    if (displayBankElement) { displayBankElement.textContent = selectedBank; }
    if (displayModeElement) { displayModeElement.textContent = currentMode.toUpperCase(); }
    if (modeSwitchElement) { modeSwitchElement.dataset.mode = currentMode; }
    if (screenAreaElement) { screenAreaElement.classList.toggle('screen-hold-mode', currentMode === 'hold'); }

    bankButtons.forEach(btn => { btn.classList.toggle('active-bank', btn.dataset.bank === selectedBank); });

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
    console.log("[Options UI] Updated UI from settings. Current Bank:", selectedBank, "Mode:", currentMode);
}

// Modified save function to accept optional forcedisEnabled state
function saveSettingsToStorage(specificUpdate = null, forceIsEnabledState = null) {
    if (!isInitialized && !specificUpdate && forceIsEnabledState === null) { return; } // Allow initial save, specific updates, or enable toggle

    // Determine isEnabled state: use forced value if provided, otherwise read from button
    const currentIsEnabled = (forceIsEnabledState !== null)
        ? forceIsEnabledState
        : (enableButtonElement?.classList.contains('enabled-state') ?? true);

    const currentMode = modeSwitchElement?.dataset.mode || '1shot';
    const bankToUpdate = currentSelectedBank;

    chrome.storage.local.get([settingsStorageKey], (result) => {
        if (chrome.runtime.lastError) { console.error("[Options Save] Read Error:", chrome.runtime.lastError); return; }
        const settingsToSave = sanitizeSettings(result[settingsStorageKey]);

        if (specificUpdate && specificUpdate.key !== undefined && specificUpdate.key !== null && specificUpdate.key !== '0') {
             settingsToSave.banks[bankToUpdate].timestamps = settingsToSave.banks[bankToUpdate].timestamps || {};
             let finalValue = null;
             if(specificUpdate.value !== null && specificUpdate.value !== '' && !isNaN(parseFloat(specificUpdate.value)) && parseFloat(specificUpdate.value) >= 0){ finalValue = parseFloat(parseFloat(specificUpdate.value).toFixed(2)); }
             else { finalValue = null; }
             settingsToSave.banks[bankToUpdate].timestamps[specificUpdate.key] = finalValue;
        }

        // Set isEnabled based on determined value (forced or from class)
        settingsToSave.isEnabled = currentIsEnabled;
        settingsToSave.selectedBank = bankToUpdate;
        settingsToSave.banks[bankToUpdate].mode = currentMode;

        chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => {
             if (chrome.runtime.lastError) { console.error("[Options Save] SAVE FAILED:", chrome.runtime.lastError); statusElement.textContent = 'Error saving settings!'; statusElement.style.color = 'red'; }
             else {
                 console.log("[Options Save] Settings saved successfully.");
                 if(isInitialized){ statusElement.textContent = 'Saved.'; statusElement.style.color = 'green'; statusElement.style.opacity = '1'; setTimeout(() => { if (statusElement.textContent === 'Saved.') statusElement.style.opacity = '0'; }, 1500); }
                 // Let storage listener handle final UI update
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
           if (!loadedSettings || !loadedSettings.banks || !loadedSettings.selectedBank) {
               statusElement.textContent = 'Initializing default settings...'; statusElement.style.color = 'orange';
               chrome.storage.local.set({ [settingsStorageKey]: settingsToUse }, () => {
                   if (!chrome.runtime.lastError) { console.log("Saved initial default structure."); setTimeout(() => { if(statusElement.textContent.startsWith('Initializing')) statusElement.textContent = ''; }, 2000); }
                   else { console.error("Failed to save initial defaults:", chrome.runtime.lastError); }
               });
           }
        }
        updateUIFromSettings(settingsToUse);
        isInitialized = true;
        console.log("[Options Restore] Restore complete. Initialized.");
     });
}

function handleBankChange(event) {
    const newBank = event.currentTarget.dataset.bank;
    if (!isInitialized || !newBank || newBank === currentSelectedBank) { return; }
    currentSelectedBank = newBank;
    saveSettingsToStorage();
}

function handleClearAll() {
    if (!isInitialized) return;
    if (confirm(`Are you sure you want to clear all timestamps for Bank ${currentSelectedBank}?`)) {
         chrome.storage.local.get([settingsStorageKey], (result) => {
             if (chrome.runtime.lastError) { console.error("ClearAll Error: Get failed", chrome.runtime.lastError); statusElement.textContent = 'Error reading settings.'; statusElement.style.color = 'red'; return; }
             const settingsToSave = sanitizeSettings(result[settingsStorageKey]);
             settingsToSave.banks[currentSelectedBank].timestamps = getDefaultBankData().timestamps;
             settingsToSave.selectedBank = currentSelectedBank;
             settingsToSave.isEnabled = enableButtonElement?.classList.contains('enabled-state') ?? true;
             chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => {
                 if (chrome.runtime.lastError) { console.error("ClearAll Error: Set failed", chrome.runtime.lastError); statusElement.textContent = `Error clearing Bank ${currentSelectedBank}.`; statusElement.style.color = 'red'; }
                 else {
                      console.log(`[Options Clear] Bank ${currentSelectedBank} timestamps cleared and saved.`);
                      statusElement.textContent = `Timestamps for Bank ${currentSelectedBank} cleared.`; statusElement.style.color = 'blue'; statusElement.style.opacity = '1';
                      setTimeout(() => { if (statusElement.textContent.includes('cleared')) { statusElement.textContent = ''; statusElement.style.opacity = '0';} }, 2000);
                 }
            });
        });
    }
}

// Modified enable toggle handler
function handleEnableToggle() {
    if (!isInitialized || !enableButtonElement) return;
    // Determine the *new* state we want to save
    const currentIsEnabled = enableButtonElement.classList.contains('enabled-state');
    const newState = !currentIsEnabled;
    // Don't update UI here directly
    console.log(`[Options Enable Toggle] Button clicked. Intending to set state to: ${newState}`);
    // Call save, passing the desired new state explicitly
    saveSettingsToStorage(null, newState);
}

function handlePadInputChange(event) {
    const inputElement = event.target; const key = inputElement.dataset.key; let value = inputElement.value;
    if (!key || key === '0') return; let finalValue = null;
    if (value !== '') { const num = parseFloat(value); if (!isNaN(num) && num >= 0) { finalValue = num; } else { console.warn(`Invalid input for Pad ${key}: ${value}.`); } }
    saveSettingsToStorage({ key: key, value: finalValue });
}

function handlePadAdjustClick(event) {
    const button = event.target.closest('.pad-adjust'); if (!button) return;
    const key = button.dataset.key; const delta = parseFloat(button.dataset.delta); const padElement = button.closest('.mpc-pad'); const inputElement = padElement?.querySelector(`.pad-input[data-key="${key}"]`);
    if (!inputElement || isNaN(delta)) return; let currentValue = parseFloat(inputElement.value); if (isNaN(currentValue)) { currentValue = 0; }
    let newValue = Math.max(0, currentValue + delta); newValue = parseFloat(newValue.toFixed(2)); inputElement.value = newValue.toFixed(2);
    saveSettingsToStorage({ key: key, value: newValue });
}

function handlePadClearClick(event) {
    const button = event.target.closest('.pad-clear-button'); if (!button) return;
    const key = button.dataset.key; const padElement = button.closest('.mpc-pad'); const inputElement = padElement?.querySelector(`.pad-input[data-key="${key}"]`);
    if (!inputElement) return; inputElement.value = '';
    saveSettingsToStorage({ key: key, value: null });
}

function handleModeSwitchClick(event) {
    if (!isInitialized) return;
    const track = event.currentTarget; const currentMode = track.dataset.mode; const newMode = (currentMode === '1shot') ? 'hold' : '1shot';
    // Optimistically update UI
    track.dataset.mode = newMode; if (displayModeElement) { displayModeElement.textContent = newMode.toUpperCase(); } if (screenAreaElement) { screenAreaElement.classList.toggle('screen-hold-mode', newMode === 'hold'); }
    // Save - reads mode from data attribute
    saveSettingsToStorage();
}

document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    document.addEventListener('mousemove', (event) => { latestMouseX = event.clientX; latestMouseY = event.clientY; });
    document.getElementById('clear-all')?.addEventListener('click', handleClearAll);
    enableButtonElement?.addEventListener('click', handleEnableToggle); // Listener still attached
    bankButtons.forEach(button => { button.addEventListener('click', handleBankChange); });
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
    }
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
