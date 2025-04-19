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

// Bank Naming Config
const MAX_BANK_NAME_LENGTH = 6; // Reduced limit
const MAX_SCREEN_BANK_NAME_LENGTH = 5; // Limit for screen display


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
    sanitized.selectedBank = sanitized.selectedBank || 'A';
    sanitized.banks = sanitized.banks || {};
    ['A', 'B', 'C', 'D'].forEach(bankId => {
        if (!sanitized.banks[bankId]) { sanitized.banks[bankId] = getDefaultBankData(); }
        else {
            sanitized.banks[bankId].timestamps = sanitized.banks[bankId].timestamps || getDefaultBankData().timestamps;
            sanitized.banks[bankId].mode = sanitized.banks[bankId].mode || getDefaultBankData().mode;
            sanitized.banks[bankId].name = sanitized.banks[bankId].name !== undefined ? sanitized.banks[bankId].name : null;
            delete sanitized.banks[bankId].timestamps['0'];
        }
    });
    return sanitized;
}

// --- Update UI - Handles bank name display ---
function updateUIFromSettings(settings) {
    const cleanSettings = sanitizeSettings(settings);
    const selectedBank = cleanSettings.selectedBank;
    currentSelectedBank = selectedBank; // Keep track locally
    const isEnabled = cleanSettings.isEnabled;
    const currentBankData = cleanSettings.banks[selectedBank]; // Data for the currently selected bank
    const currentMode = currentBankData.mode;
    const currentBankName = currentBankData.name; // Custom name (or null)

    // Update Bank Buttons Text and Active State
    bankButtons.forEach(btn => {
        const bankId = btn.dataset.bank;
        const bankData = cleanSettings.banks[bankId]; // Get data for THIS button's bank
        const defaultName = `Bank ${bankId}`;
        const displayName = bankData?.name || defaultName;
        btn.textContent = displayName; // Update button text
        btn.classList.toggle('active-bank', bankId === selectedBank);
    });

    // Update screen based on SELECTED bank's data
    if (enableButtonElement) {
        enableButtonElement.textContent = isEnabled ? 'ON' : 'OFF';
        enableButtonElement.classList.toggle('enabled-state', isEnabled);
        enableButtonElement.classList.toggle('disabled-state', !isEnabled);
    }
    if (displayStatusElement) { displayStatusElement.textContent = isEnabled ? 'ON' : 'OFF'; }
    // Update BANK display on screen
    if (displayBankElement) {
        if (currentBankName) { // If custom name exists, show it (truncated, uppercase)
            displayBankElement.textContent = currentBankName.toUpperCase().slice(0, MAX_SCREEN_BANK_NAME_LENGTH);
        } else { // Otherwise, show the default letter
            displayBankElement.textContent = selectedBank;
        }
    }
    if (displayModeElement) { displayModeElement.textContent = currentMode.toUpperCase(); }
    if (modeSwitchElement) { modeSwitchElement.dataset.mode = currentMode; }
    if (screenAreaElement) { screenAreaElement.classList.toggle('screen-hold-mode', currentMode === 'hold'); }

    // Update Pads based on selected bank's data
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


// --- Save Bank Name Function ---
async function saveBankName(bankId, newName) {
     console.log(`Attempting to save name for Bank ${bankId}: "${newName}"`);
     const nameToSave = (newName === null || newName.trim() === '') ? null : newName.trim().slice(0, MAX_BANK_NAME_LENGTH);

     try {
        // Use storage.local.get and set directly for simplicity here
        chrome.storage.local.get([settingsStorageKey], (result) => {
            if (chrome.runtime.lastError) { throw new Error(chrome.runtime.lastError); }
            const settingsToSave = sanitizeSettings(result[settingsStorageKey]);
            settingsToSave.banks[bankId].name = nameToSave;

            chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => {
                if (chrome.runtime.lastError) { throw new Error(chrome.runtime.lastError); }
                console.log(`Bank ${bankId} name saved as:`, nameToSave);
                statusElement.textContent = `Bank ${bankId} name updated.`; statusElement.style.color = 'green'; statusElement.style.opacity = '1';
                setTimeout(() => { if (statusElement.textContent.includes('name updated')) statusElement.style.opacity = '0'; }, 1500);
                // UI update is handled by the storage listener
            });
        });
     } catch (error) {
        console.error(`Error saving name for Bank ${bankId}:`, error);
        statusElement.textContent = 'Error saving bank name!'; statusElement.style.color = 'red';
     }
}


function saveSettingsToStorage(specificUpdate = null, forceIsEnabledState = null) {
    if (!isInitialized && !specificUpdate && forceIsEnabledState === null) { return; }

    const currentIsEnabled = (forceIsEnabledState !== null) ? forceIsEnabledState : (enableButtonElement?.classList.contains('enabled-state') ?? true);
    const currentMode = modeSwitchElement?.dataset.mode || '1shot';
    const bankToUpdate = currentSelectedBank; // Use internal state

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

        settingsToSave.isEnabled = currentIsEnabled;
        settingsToSave.selectedBank = bankToUpdate;
        settingsToSave.banks[bankToUpdate].mode = currentMode;
        // Bank Name is saved separately by saveBankName

        chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => {
             if (chrome.runtime.lastError) { console.error("[Options Save] SAVE FAILED:", chrome.runtime.lastError); statusElement.textContent = 'Error saving settings!'; statusElement.style.color = 'red'; }
             else {
                 console.log("[Options Save] Settings saved successfully.");
                 if(isInitialized && !specificUpdate && forceIsEnabledState === null){ // Show saved only for non-specific updates initiated while initialized
                    statusElement.textContent = 'Saved.'; statusElement.style.color = 'green'; statusElement.style.opacity = '1';
                    setTimeout(() => { if (statusElement.textContent === 'Saved.') statusElement.style.opacity = '0'; }, 1500);
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
           if (!loadedSettings || !loadedSettings.banks || !loadedSettings.selectedBank) {
               statusElement.textContent = 'Initializing default settings...'; statusElement.style.color = 'orange';
               chrome.storage.local.set({ [settingsStorageKey]: settingsToUse }, () => {
                   if (!chrome.runtime.lastError) { console.log("Saved initial default structure."); setTimeout(() => { if(statusElement.textContent.startsWith('Initializing')) statusElement.textContent = ''; }, 2000); }
                   else { console.error("Failed to save initial defaults:", chrome.runtime.lastError); }
               });
           }
        }
        updateUIFromSettings(settingsToUse); // Update UI with loaded/defaulted settings
        isInitialized = true;
        console.log("[Options Restore] Restore complete. Initialized.");
     });
}

function handleBankChange(event) {
    const newBank = event.currentTarget.dataset.bank;
    if (!isInitialized || !newBank || newBank === currentSelectedBank) { return; }
    currentSelectedBank = newBank;
    // Update UI immediately to show correct state for the clicked bank
    chrome.storage.local.get([settingsStorageKey], (result) => {
        const settings = sanitizeSettings(result[settingsStorageKey]);
        settings.selectedBank = newBank; // Reflect the intended selection for UI update
        updateUIFromSettings(settings);
        saveSettingsToStorage(); // Save the new selectedBank
    });
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


function handleEnableToggle() {
    if (!isInitialized || !enableButtonElement) return;
    const currentIsEnabled = enableButtonElement.classList.contains('enabled-state');
    const newState = !currentIsEnabled;
    console.log(`[Options Enable Toggle] Button clicked. Intending to set state to: ${newState}`);
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
    track.dataset.mode = newMode; if (displayModeElement) { displayModeElement.textContent = newMode.toUpperCase(); } if (screenAreaElement) { screenAreaElement.classList.toggle('screen-hold-mode', newMode === 'hold'); }
    saveSettingsToStorage();
}

// --- Bank Name Editing Handlers ---
let currentEditingBankBtn = null; // Track which button is being edited

async function handleBankNameEdit(event) {
    // Prevent editing if already editing another button
    if (currentEditingBankBtn && currentEditingBankBtn !== event.currentTarget) {
        currentEditingBankBtn.blur(); // Finish previous edit first
    }
    currentEditingBankBtn = event.currentTarget;
    const button = event.currentTarget;
    const bankId = button.dataset.bank;

    // Get current custom name from storage to populate input correctly
    const settings = sanitizeSettings(await chrome.storage.local.get([settingsStorageKey]))[settingsStorageKey];
    const currentCustomName = settings.banks[bankId]?.name || ''; // Use empty string if null

    // Create temporary input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'temp-bank-name-input'; // For styling
    input.value = currentCustomName; // Start with custom name or empty
    input.maxLength = MAX_BANK_NAME_LENGTH;
    input.spellcheck = false;
    input.dataset.bankId = bankId; // Store bankId for saving
    input.dataset.defaultName = `Bank ${bankId}`; // Store default name for revert/display

    // Position input over button
    const btnRect = button.getBoundingClientRect();
    const containerRect = button.parentElement.getBoundingClientRect(); // Use parent container for relative pos
    input.style.position = 'absolute';
    input.style.top = `${button.offsetTop}px`;
    input.style.left = `${button.offsetLeft}px`;
    input.style.width = `${btnRect.width}px`;
    input.style.height = `${btnRect.height}px`;
    // Match font styles (may need more specific CSS rules)
    input.style.fontSize = getComputedStyle(button).fontSize;
    input.style.fontWeight = getComputedStyle(button).fontWeight;
    input.style.textAlign = 'center';


    // Hide button, show input
    button.style.visibility = 'hidden'; // Use visibility to keep layout stable
    button.parentElement.appendChild(input); // Add to container
    input.focus();
    input.select();

    // Add listeners to input
    input.addEventListener('blur', handleBankNameBlur, { once: true });
    input.addEventListener('keydown', handleBankNameKeyDown);
}

function handleBankNameKeyDown(event) {
    const input = event.currentTarget;
    if (event.key === 'Enter') {
        event.preventDefault();
        input.blur(); // Trigger save/cleanup
    } else if (event.key === 'Escape') {
        // Cancel edit: remove input, show button with original text (handled in blur cleanup)
        input.value = 'ESCAPE_TRIGGERED'; // Use a special value to signal cancellation in blur
        input.blur();
    }
}

function handleBankNameBlur(event) {
    const input = event.currentTarget;
    const bankId = input.dataset.bankId;
    const defaultName = input.dataset.defaultName;
    const originalButton = document.getElementById(`bank-btn-${bankId.toLowerCase()}`); // Find original button

    if (!originalButton) return; // Should not happen

    const finalValue = input.value.trim();

    // Remove input, show button
    input.remove(); // Remove the temporary input
    originalButton.style.visibility = 'visible'; // Make original button visible again
    currentEditingBankBtn = null; // No longer editing

    // Check if Escape was pressed
    if (finalValue === 'ESCAPE_TRIGGERED') {
        console.log(`Bank ${bankId} name edit cancelled.`);
        // No need to save, updateUIFromSettings triggered by listener eventually will fix text if needed
        // Or force update now? Let's rely on listener.
        return;
    }

    // Determine name to save (null if empty, otherwise trimmed/limited value)
    const nameToSave = (finalValue === '') ? null : finalValue.slice(0, MAX_BANK_NAME_LENGTH);

    // Update button text immediately
    originalButton.textContent = nameToSave || defaultName;

    // Save the name
    saveBankName(bankId, nameToSave);
}

document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    document.addEventListener('mousemove', (event) => { latestMouseX = event.clientX; latestMouseY = event.clientY; });
    document.getElementById('clear-all')?.addEventListener('click', handleClearAll);
    enableButtonElement?.addEventListener('click', handleEnableToggle);

    bankButtons.forEach(button => {
        button.addEventListener('click', handleBankChange); // Single click selects
        button.addEventListener('dblclick', handleBankNameEdit); // Double click edits
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
