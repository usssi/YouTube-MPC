// options.js

const storageKey = 'youtubeSamplerKeys_timestamps';

// Function to save options to chrome.storage
function saveOptions() {
  const timestamps = {};
  for (let i = 0; i <= 9; i++) {
    const inputElement = document.getElementById(`key${i}`);
    const value = inputElement.value;
    // Only save if a value is entered and is a valid non-negative number
    if (value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0) {
      timestamps[i.toString()] = parseFloat(value);
    } else {
       timestamps[i.toString()] = null; // Store null or simply omit if invalid/empty
       inputElement.value = ''; // Clear invalid input
    }
  }

  chrome.storage.sync.set({ [storageKey]: timestamps }, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
     if (chrome.runtime.lastError) {
        status.textContent = 'Error saving settings.';
        console.error("Error saving settings:", chrome.runtime.lastError);
    } else {
        status.textContent = 'Options saved.';
        console.log("Options saved:", timestamps);
        setTimeout(() => {
          status.textContent = '';
        }, 1500); // Clear status after 1.5 seconds
    }
  });
}

// Function to restore options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get([storageKey], (result) => {
     if (chrome.runtime.lastError) {
        console.error("Error loading settings:", chrome.runtime.lastError);
        return;
    }
    const savedTimestamps = result[storageKey] || {};
    console.log("Restoring options:", savedTimestamps);
    for (let i = 0; i <= 9; i++) {
      const inputElement = document.getElementById(`key${i}`);
      if (savedTimestamps[i.toString()] !== undefined && savedTimestamps[i.toString()] !== null) {
        inputElement.value = savedTimestamps[i.toString()];
      } else {
        inputElement.value = ''; // Clear if no value was saved
      }
    }
  });
}

// Add event listeners once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
