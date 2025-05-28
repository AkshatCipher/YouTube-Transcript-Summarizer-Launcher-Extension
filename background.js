// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.local.set({
    aiPlatform: 'chatgpt',
    customPrompt: 'Please summarize this YouTube video transcript:\n\n[transcript]'
  });
}); 