// Create and inject UI elements
function createUI() {
  // Create sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'youtube-transcript-sidebar';
  sidebar.innerHTML = `
    <div class="transcript-content"></div>
  `;
  document.body.appendChild(sidebar);

  // Create summarize button
  const summarizeButton = document.createElement('button');
  summarizeButton.className = 'summarize-button';
  summarizeButton.textContent = 'Summarize';
  document.body.appendChild(summarizeButton);

  // Create copy transcript button
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-button';
  copyButton.textContent = 'Copy Transcript';
  document.body.appendChild(copyButton);

  // Create toggle sidebar button
  const toggleButton = document.createElement('button');
  toggleButton.className = 'toggle-button';
  toggleButton.innerHTML = '<img src="' + chrome.runtime.getURL('icons/transcript icon.png') + '" alt="Transcript" style="width: 16px; height: 16px;">';
  document.body.appendChild(toggleButton);

  return { sidebar, summarizeButton, copyButton, toggleButton };
}

// Wait for an element to be present in the DOM
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}

// Extract transcript from YouTube
async function extractTranscript() {
  try {
    // Wait for the video to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to find the transcript button in different ways
    let transcriptButton = null;
    
    // Method 1: Try the "..." menu
    try {
      const menuButton = await waitForElement('button.ytp-button[aria-label="More actions"]');
      menuButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const menuItems = Array.from(document.querySelectorAll('tp-yt-paper-item'));
      transcriptButton = menuItems.find(item => 
        item.textContent.includes('Show transcript') || 
        item.textContent.includes('Open transcript')
      );
    } catch (error) {
      console.log('Menu method failed, trying alternative methods');
    }

    // Method 2: Try the CC button
    if (!transcriptButton) {
      try {
        const ccButton = await waitForElement('button.ytp-subtitles-button');
        ccButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log('CC button method failed');
      }
    }

    // Method 3: Try the transcript button directly
    if (!transcriptButton) {
      try {
        transcriptButton = await waitForElement('button[aria-label*="transcript" i]');
      } catch (error) {
        console.log('Direct transcript button method failed');
      }
    }

    if (!transcriptButton) {
      console.log('No transcript button found');
      return null;
    }

    transcriptButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try different selectors for transcript content
    let transcriptText = '';
    
    // Try different selectors
    const selectors = [
      'ytd-transcript-segment-renderer',
      'ytd-transcript-body-renderer',
      '.ytd-transcript-segment-renderer',
      '.ytd-transcript-body-renderer',
      '[id="content"]',
      '.segment-text'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        transcriptText = Array.from(elements)
          .map(item => item.textContent.trim())
          .filter(text => text.length > 0)
          .join('\n');
        break;
      }
    }

    if (!transcriptText) {
      console.log('No transcript content found');
      return null;
    }

    return transcriptText;
  } catch (error) {
    console.error('Error extracting transcript:', error);
    return null;
  }
}

// Handle summarize button click
async function handleSummarize(transcript) {
  if (!transcript) {
    alert('No transcript available for this video.');
    return;
  }

  try {
    const settings = await new Promise(resolve => {
      chrome.storage.local.get(['aiPlatform', 'customPrompt'], resolve);
    });

    const prompt = settings.customPrompt.replace('[transcript]', transcript);
    let url;

    switch (settings.aiPlatform) {
      case 'chatgpt':
        url = 'https://chat.openai.com/';
        break;
      case 'gemini':
        url = 'https://gemini.google.com/';
        break;
      case 'claude':
        url = 'https://claude.ai/';
        break;
      default:
        throw new Error('Invalid AI platform selected');
    }

    // Copy the prompt to clipboard
    await navigator.clipboard.writeText(prompt);
    
    // Open the selected platform in a new tab
    window.open(url, '_blank');
    
    // Show a notification that the prompt was copied
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a73e8;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    notification.textContent = 'Prompt copied to clipboard! You can now paste it into the AI platform.';
    document.body.appendChild(notification);
    
    // Remove the notification after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);

  } catch (error) {
    console.error('Error opening AI platform:', error);
    alert(error.message || 'Failed to open AI platform. Please try again.');
  }
}

// Handle copy transcript
function handleCopy(transcript) {
  if (!transcript) {
    alert('No transcript available to copy.');
    return;
  }

  navigator.clipboard.writeText(transcript).then(() => {
    alert('Transcript copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy transcript:', err);
    alert('Failed to copy transcript. Please try again.');
  });
}

// Main initialization
async function initialize() {
  const { sidebar, summarizeButton, copyButton, toggleButton } = createUI();
  let transcript = null;

  // Function to try extracting transcript
  const tryExtractTranscript = async () => {
    transcript = await extractTranscript();
    if (transcript) {
      sidebar.querySelector('.transcript-content').textContent = transcript;
      return true;
    }
    return false;
  };

  // Try to extract transcript immediately
  await tryExtractTranscript();

  // Set up observer for video changes
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        const success = await tryExtractTranscript();
        if (success) break;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';
  
  // Add retry button
  const retryButton = document.createElement('button');
  retryButton.className = 'retry-button';
  retryButton.textContent = 'Retry Transcript';
  retryButton.addEventListener('click', async () => {
    const success = await tryExtractTranscript();
    if (!success) {
      alert('Failed to extract transcript. Please make sure the video has captions available.');
    }
  });

  // Add buttons to container
  buttonContainer.appendChild(retryButton);
  buttonContainer.appendChild(summarizeButton);
  buttonContainer.appendChild(copyButton);

  // Add button container to sidebar
  sidebar.insertBefore(buttonContainer, sidebar.firstChild);

  // Event listeners
  summarizeButton.addEventListener('click', () => handleSummarize(transcript));
  copyButton.addEventListener('click', () => handleCopy(transcript));
  toggleButton.addEventListener('click', () => {
    sidebar.classList.toggle('visible');
  });
}

// Start the extension
initialize(); 