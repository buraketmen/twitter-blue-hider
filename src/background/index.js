chrome.runtime.onInstalled.addListener(async () => {
  const { isEnabled = null } = await chrome.storage.sync.get("isEnabled");
  if (isEnabled === null || isEnabled === undefined) {
    chrome.storage.sync.set({
      isEnabled: true,
      showCards: true,
    });
  }
});

chrome.runtime.onSuspend.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      try {
        chrome.tabs.sendMessage(tab.id, { action: "CLEAN_UP" });
      } catch (error) {
        console.error("Error sending cleanup message:", error);
      }
    });
  });
});
