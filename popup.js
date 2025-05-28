document.addEventListener('DOMContentLoaded', () => {
  const aiPlatformSelect = document.getElementById('aiPlatform');
  const customPromptTextarea = document.getElementById('customPrompt');
  const maxLengthInput = document.getElementById('maxLength');
  const minLengthInput = document.getElementById('minLength');
  const saveSettingsButton = document.getElementById('saveSettings');
  const resetSettingsButton = document.getElementById('resetSettings');
  const statusMessage = document.getElementById('status');

  // Default settings
  const defaultSettings = {
    aiPlatform: 'chatgpt',
    customPrompt: 'Please summarize this YouTube video transcript:\n\n[transcript]',
    maxLength: 130,
    minLength: 30
  };

  // Load saved settings
  chrome.storage.local.get(['aiPlatform', 'customPrompt', 'maxLength', 'minLength'], (settings) => {
    aiPlatformSelect.value = settings.aiPlatform || defaultSettings.aiPlatform;
    customPromptTextarea.value = settings.customPrompt || defaultSettings.customPrompt;
    maxLengthInput.value = settings.maxLength || defaultSettings.maxLength;
    minLengthInput.value = settings.minLength || defaultSettings.minLength;
  });

  // Save settings
  saveSettingsButton.addEventListener('click', () => {
    const settings = {
      aiPlatform: aiPlatformSelect.value,
      customPrompt: customPromptTextarea.value || defaultSettings.customPrompt,
      maxLength: parseInt(maxLengthInput.value) || defaultSettings.maxLength,
      minLength: parseInt(minLengthInput.value) || defaultSettings.minLength
    };

    chrome.storage.local.set(settings, () => {
      statusMessage.textContent = 'Settings saved!';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 2000);
    });
  });

  // Reset settings
  resetSettingsButton.addEventListener('click', () => {
    aiPlatformSelect.value = defaultSettings.aiPlatform;
    customPromptTextarea.value = defaultSettings.customPrompt;
    maxLengthInput.value = defaultSettings.maxLength;
    minLengthInput.value = defaultSettings.minLength;

    chrome.storage.local.set(defaultSettings, () => {
      statusMessage.textContent = 'Settings reset to default!';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 2000);
    });
  });
}); 