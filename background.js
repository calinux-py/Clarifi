chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "summarizeText",
    title: "Summarize with Clarifi",
    contexts: ["selection"]
  });
  chrome.storage.sync.set({ unreadCount: 0 });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "summarizeText") {
    const selectedText = info.selectionText;
    
    chrome.storage.sync.get(['apiKey'], async function(data) {
      if (!data.apiKey) {
        console.error('No API key found');
        return;
      }
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that summarizes text concisely while maintaining key information. Use HTML and bullet points."
              },
              {
                role: "user",
                content: `Please summarize the following text: ${selectedText}`
              }
            ],
            max_tokens: 650
          })
        });

        const result = await response.json();
        
        if (result.choices && result.choices[0]) {
          const summary = result.choices[0].message.content;
          
          const newEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            title: selectedText.substring(0, 30) + "...",
            summary: summary,
            originalText: selectedText
          };

          chrome.storage.sync.get(['entries', 'unreadCount'], function(data) {
            const entries = data.entries || [];
            const unreadCount = (data.unreadCount || 0) + 1;
            entries.unshift(newEntry);
            
            chrome.storage.sync.set({ 
              entries: entries,
              unreadCount: unreadCount
            }, function() {
              chrome.action.setBadgeText({ text: unreadCount.toString() });
              chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
              
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon/icon48.png',
                title: 'Clarifi',
                message: 'Text has been summarized! Click the extension icon to view.'
              });
            });
          });
        }
      } catch (error) {
        console.error('Error:', error);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon/icon48.png',
          title: 'Clarifi Error',
          message: 'Failed to summarize text. Please check your API key and try again.'
        });
      }
    });
  }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync' && changes.entries) {
    const oldEntries = changes.entries.oldValue || [];
    const newEntries = changes.entries.newValue || [];
    if (newEntries.length > oldEntries.length) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ADD8E6' });
    }
  }
});

chrome.notifications.onClicked.addListener(function(notificationId) {
  chrome.action.openPopup();
});