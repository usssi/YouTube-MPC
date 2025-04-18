// options.js (with Autosave and English Status Messages)

const settingsKey = 'youtubeSamplerKeys_settings';
let saveTimeout;
const debounceTime = 500;
const statusElement = document.getElementById('status');

function debounce(func, delay) {
  return function(...args) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

function saveOptions() {
  const timestamps = {};
  for (let i = 0; i <= 9; i++) {
    const inputElement = document.getElementById(`key${i}`);
    const value = inputElement.value;
    if (value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0) {
      timestamps[i.toString()] = parseFloat(value);
    } else {
      timestamps[i.toString()] = null;
    }
  }

  let selectedMode = 'trigger';
  const modeChecked = document.querySelector('input[name="mode"]:checked');
   if(modeChecked) {
       selectedMode = modeChecked.value;
   }

  const settings = {
    timestamps: timestamps,
    mode: selectedMode
  };

  chrome.storage.sync.set({ [settingsKey]: settings }, () => {
    if (chrome.runtime.lastError) {
      // --- ENGLISH STATUS ---
      statusElement.textContent = 'Error saving settings.';
      statusElement.style.color = 'red';
      console.error("Error saving settings:", chrome.runtime.lastError);
    } else {
      // --- ENGLISH STATUS ---
      statusElement.textContent = 'Saved.';
      statusElement.style.color = 'green';
      console.log("Autosaved settings:", settings);
      setTimeout(() => {
        statusElement.textContent = '';
      }, 2000);
    }
  });
}

function restoreOptions() {
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

    for (let i = 0; i <= 9; i++) {
      const inputElement = document.getElementById(`key${i}`);
      if (savedTimestamps[i.toString()] !== undefined && savedTimestamps[i.toString()] !== null) {
        inputElement.value = savedTimestamps[i.toString()];
      } else {
        inputElement.value = '';
      }
    }

    const modeRadioButton = document.getElementById(`mode-${savedMode}`);
    if (modeRadioButton) {
        modeRadioButton.checked = true;
    } else {
        document.getElementById('mode-trigger').checked = true;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();

  const debouncedSave = debounce(saveOptions, debounceTime);

  for (let i = 0; i <= 9; i++) {
    const inputElement = document.getElementById(`key${i}`);
    if(inputElement) {
        inputElement.addEventListener('input', debouncedSave);
    }
  }
   const modeRadios = document.querySelectorAll('input[name="mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', debouncedSave);
    });
});
