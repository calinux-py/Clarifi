chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'summarizeText',
    title: 'Summarize with Clarifi',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== 'summarizeText') return;

  let selectedText = info.selectionText;

  chrome.storage.sync.get('apiKey', async (data) => {
    if (!data.apiKey) {
      return handleMissingApiKey();
    }

    try {
      const summary = await fetchSummary(data.apiKey, selectedText);
      const cleanedSummary = trimCodeBlocks(summary);
      
      const newEntry = createEntry(selectedText, cleanedSummary);

      selectedText = null;

      addEntry(newEntry);
    } catch (error) {
      console.error('Summarization error:', error);
      updateBadge('E', '#FF0000');
    }
  });
});

function handleMissingApiKey() {
  console.error('No API key found');
  updateBadge('API', '#FF0000');
}

function updateBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

async function fetchSummary(apiKey, selectedText) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that summarizes text concisely while maintaining key information. Use HTML and bullet points. ALWAYS use codeblocks',
        },
        {
          role: 'user',
          content: `Please summarize the following text using HTML using codeblocks: ${selectedText}`,
        },
      ],
      max_tokens: 950,
    }),
  });

  const result = await response.json();
  if (result.choices && result.choices[0]) {
    return result.choices[0].message.content;
  }
  throw new Error('No summary returned');
}

function trimCodeBlocks(text) {
  let summary = text.trim();
  if (summary.startsWith('```html')) {
    summary = summary.slice(7).trim();
  }
  if (summary.endsWith('```')) {
    summary = summary.slice(0, -3).trim();
  }
  return summary;
}

function createEntry(originalText, summary) {
  const MAX_LENGTH = 4000;
  const truncate = (str) =>
    str.length > MAX_LENGTH ? str.substring(0, MAX_LENGTH) + '...' : str;

  return {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    title: truncate(originalText.substring(0, 30) + '...'),
    summary: truncate(summary),
  };
}

function addEntry(newEntry) {
  chrome.storage.sync.get(['entries'], (data) => {
    const entries = data.entries || [];
    entries.unshift(newEntry);
    if (entries.length > 4) {
      entries.pop();
    }
    chrome.storage.sync.set({ entries }, () => {
      updateBadge('!', '#ADD8E6');
    });
  });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.entries) {
    const oldEntries = changes.entries.oldValue || [];
    const newEntries = changes.entries.newValue || [];
    if (newEntries.length > oldEntries.length) {
      updateBadge('!', '#ADD8E6');
    }
  }
});
