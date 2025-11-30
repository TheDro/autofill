document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('model');
  const maxTokensInput = document.getElementById('maxTokens');
  const maxTokensValue = document.getElementById('maxTokensValue');
  const temperatureInput = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperatureValue');
  const enabledCheckbox = document.getElementById('enabled');
  const saveButton = document.getElementById('saveButton');
  const statusElement = document.getElementById('status');

  // Load saved settings
  const settings = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      resolve(response.settings);
    });
  });

  // Populate form with saved settings
  apiKeyInput.value = settings.apiKey || '';
  modelSelect.value = settings.model || 'gpt-3.5-turbo';
  maxTokensInput.value = settings.maxTokens || 50;
  maxTokensValue.textContent = settings.maxTokens || 50;
  temperatureInput.value = settings.temperature || 0.7;
  temperatureValue.textContent = settings.temperature || 0.7;
  enabledCheckbox.checked = settings.enabled !== false;

  // Update value displays
  maxTokensInput.addEventListener('input', (e) => {
    maxTokensValue.textContent = e.target.value;
  });

  temperatureInput.addEventListener('input', (e) => {
    temperatureValue.textContent = e.target.value;
  });

  // Save settings
  saveButton.addEventListener('click', async () => {
    const newSettings = {
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value,
      maxTokens: parseInt(maxTokensInput.value, 10),
      temperature: parseFloat(temperatureInput.value),
      enabled: enabledCheckbox.checked
    };

    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'SAVE_SETTINGS', settings: newSettings },
          (response) => {
            if (chrome.runtime.lastError) {
              throw new Error(chrome.runtime.lastError);
            }
            resolve(response);
          }
        );
      });

      showStatus('Settings saved successfully!', 'success');
      
      // Close the popup after a short delay
      setTimeout(() => window.close(), 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  });

  // Show status message
  function showStatus(message, type = 'info') {
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }

  // Focus the save button when popup opens
  saveButton.focus();
});
