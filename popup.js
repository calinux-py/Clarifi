document.addEventListener('DOMContentLoaded', function() {
  chrome.action.setBadgeText({ text: '' });
  
  const settingsIcon = document.querySelector('.settings-icon');
  const settingsPanel = document.querySelector('.settings-panel');
  const apiKeyInput = document.getElementById('api-key');
  const darkModeToggle = document.getElementById('dark-mode');
  const entriesContainer = document.getElementById('entries');

  chrome.storage.sync.get(['apiKey', 'darkMode', 'entries'], function(data) {
    if (data.apiKey) {
      apiKeyInput.value = '*'.repeat(data.apiKey.length);
    }
    
    if (data.darkMode) {
      darkModeToggle.checked = data.darkMode;
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    renderEntries(data.entries || []);
  });

  settingsIcon.addEventListener('click', function() {
    settingsPanel.classList.toggle('active');
  });

  apiKeyInput.addEventListener('change', function() {
    chrome.storage.sync.set({ apiKey: apiKeyInput.value });
    apiKeyInput.value = '*'.repeat(apiKeyInput.value.length);
  });

  darkModeToggle.addEventListener('change', function() {
    const isDark = darkModeToggle.checked;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    chrome.storage.sync.set({ darkMode: isDark });
  });

  function renderEntries(entries) {
    entriesContainer.innerHTML = '';

    if (!entries.length) {
      const defaultMessage = document.createElement('div');
      defaultMessage.textContent = "Add your OpenAI API in Settings then start summarizing!";
      defaultMessage.style.padding = "16px";
      defaultMessage.style.textAlign = "center";
      defaultMessage.style.color = "var(--text-color)";
      entriesContainer.appendChild(defaultMessage);
      return;
    }
    
    entries.forEach((entry, index) => {
      const entryElement = document.createElement('div');
      entryElement.className = 'entry';
      
      const timestamp = new Date(entry.timestamp);
      const formattedDate = timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();

      entryElement.innerHTML = `
        <div class="entry-header">
          <span class="entry-title">${entry.title || 'Untitled'}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="entry-timestamp">${formattedDate}</span>
            <svg class="delete-icon" viewBox="0 0 24 24" width="16" height="16" style="cursor: pointer;">
              <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6Z" />
            </svg>
            <svg class="expand-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
          </div>
        </div>
        <div class="entry-content">
          ${entry.summary}
        </div>
      `;
      
      entryElement.querySelector('.entry-header').addEventListener('click', function() {
        entryElement.classList.toggle('expanded');
      });

      const deleteIcon = entryElement.querySelector('.delete-icon');
      deleteIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        chrome.storage.sync.get('entries', function(data) {
          let entries = data.entries || [];
          entries.splice(index, 1);
          chrome.storage.sync.set({ entries: entries });
        });
      });
      
      entriesContainer.appendChild(entryElement);
    });
  }

  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.entries) {
      renderEntries(changes.entries.newValue || []);
    }
  });
});
