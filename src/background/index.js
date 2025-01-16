chrome.runtime.onInstalled.addListener(async () => {
  const { isEnabled = null } = await chrome.storage.sync.get("isEnabled");
  if (isEnabled === null || isEnabled === undefined) {
    chrome.storage.sync.set({
      isEnabled: true,
      showCards: true,
    });
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled !== undefined) {
    chrome.tabs.query({ url: "*://x.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.reload(tab.id);
      });
    });
  }
});
