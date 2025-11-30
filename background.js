// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'gpt-5-nano',
  maxTokens: 50,
  temperature: 0.7,
  enabled: true
};

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      resolve(settings);
    });
  });
}

// Save settings to storage
async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      resolve();
    });
  });
}

// Get AI completion from OpenAI API
async function getAICompletion(text, settings) {
  if (!settings.apiKey) {
    console.error('No API key provided');
    return [];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        // model: settings.model,
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that provides concise text completions.'
          },
          {
            role: 'user',
            content: `Complete the following text. Only return the completion text, nothing else. Text: "${text}"`
          }
        ],
        // max_completion_tokens: settings.maxTokens,
        // max_completion_tokens: 100,
        // stop: ['\n', '.', '!', '?']
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', JSON.stringify(errorData));
      throw new Error(errorData.error?.message || 'Failed to get AI completion');
    }

    const data = await response.json();
    let result = data.choices.map(choice => choice.message.content.trim())

    console.error(JSON.stringify(result))
    console.error(JSON.stringify(data))
    console.log({result})
    return result
  } catch (error) {
    console.error('Error getting AI completion:', error);
    return [];
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.type === 'GET_SUGGESTIONS') {
        const settings = await loadSettings();
        
        if (!settings.enabled) {
          sendResponse({ suggestions: [] });
          return;
        }
        
        const suggestions = await getAICompletion(request.text, settings);
        sendResponse({ suggestions });
      } 
      else if (request.type === 'GET_SETTINGS') {
        const settings = await loadSettings();
        sendResponse({ settings });
      }
      else if (request.type === 'SAVE_SETTINGS') {
        await saveSettings(request.settings);
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Listen for installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings on install
    chrome.storage.sync.set(DEFAULT_SETTINGS);
    
    // Open options page after installation
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }
});
