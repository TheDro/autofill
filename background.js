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
async function getAICompletion(textBefore, textAfter,  settings) {
  if (!settings.apiKey) {
    console.error('No API key provided');
    return {suggestion: "", message: "No API key provided"};
  }
  let response = {}

  try {
    response.start_request = new Date()
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        // model: settings.model,
        model: 'gpt-5-mini',
        instructions: "You are an auto-complete assistant that concisely completes text. Only return the predicted text inside of the <completion> tag.",
        input: `<text_before>${textBefore}</text_before><completion></completion><text_after>${textAfter}</text_after>`,
        reasoning: {effort: "minimal"}
        // messages: [
        //   {
        //     role: 'system',
        //     content: 'You are a helpful AI assistant that provides concise text completions.'
        //   },
        //   {
        //     role: 'user',
        //     content: `Complete the following text. Only return the completion text, nothing else. Text: "${text}"`
        //   }
        // ],
        // max_completion_tokens: settings.maxTokens,
        // max_completion_tokens: 100,
        // stop: ['\n', '.', '!', '?']
      })
    });
    response.end_request = new Date()

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error('API Error:', JSON.stringify(errorData));
      throw new Error(errorData.error?.message || 'Failed to get AI completion');
    }

    const data = await apiResponse.json();
    let result = data.output[1].content[0].text
    result = result.replace('<completion>', '').replace('</completion>', '')
    response.suggestion = result
    return response
  } catch (error) {
    console.error('Error getting AI completion:', error.message);
    return {suggestion: "", message: error.message};
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.type === 'GET_SUGGESTION') {
        const settings = await loadSettings();

        if (!settings.enabled) {
          sendResponse({suggestion: "", message: "Autocompletion is disabled"});
          return;
        }

        let response = await getAICompletion(request.textBefore, request.textAfter || "", settings);
        sendResponse(response);
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
