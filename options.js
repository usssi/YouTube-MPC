// options.js

const settingsKey = 'youtubeSamplerKeys_settings'; // Use one key for all settings

// Function to save options (timestamps and mode) to chrome.storage
function saveOptions() {
  const timestamps = {};
  for (let i = 0; i <= 9; i++) {
    const inputElement = document.getElementById(`key${i}`);
    const value = inputElement.value;
    if (value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0) {
      timestamps[i.toString()] = parseFloat(value);
    } else {
       timestamps[i.toString()] = null;
       inputElement.value = '';
    }
  }

  // Get selected mode
  const selectedMode = document.querySelector('input[name="mode"]:checked').value;

  const settings = {
    timestamps: timestamps,
    mode: selectedMode
  };

  chrome.storage.sync.set({ [settingsKey]: settings }, () => {
    const status = document.getElementById('status');
     if (chrome.runtime.lastError) {
        status.textContent = 'Error al guardar.';
        console.error("Error saving settings:", chrome.runtime.lastError);
    } else {
        status.textContent = 'Configuración guardada.';
        console.log("Settings saved:", settings);
        setTimeout(() => {
          status.textContent = '';
        }, 1500);
    }
  });
}

// Function to restore options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get([settingsKey], (result) => {
     if (chrome.runtime.lastError) {
        console.error("Error loading settings:", chrome.runtime.lastError);
        // Set default mode if loading fails
        document.getElementById('mode-trigger').checked = true;
        return;
    }
    const savedSettings = result[settingsKey] || {}; // Get the whole settings object
    const savedTimestamps = savedSettings.timestamps || {};
    const savedMode = savedSettings.mode || 'trigger'; // Default to trigger if not set

    console.log("Restoring options:", savedSettings);

    // Restore timestamps
    for (let i = 0; i <= 9; i++) {
      const inputElement = document.getElementById(`key${i}`);
      if (savedTimestamps[i.toString()] !== undefined && savedTimestamps[i.toString()] !== null) {
        inputElement.value = savedTimestamps[i.toString()];
      } else {
        inputElement.value = '';
      }
    }

    // Restore mode
    const modeRadioButton = document.getElementById(`mode-${savedMode}`);
    if (modeRadioButton) {
        modeRadioButton.checked = true;
    } else {
        // Fallback if saved mode is invalid somehow
        document.getElementById('mode-trigger').checked = true;
    }
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
