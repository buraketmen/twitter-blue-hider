let isExtensionValid = true;

chrome.runtime.onInstalled.addListener(async () => {
  const existingData = await getData("isEnabled");

  if (typeof existingData === "undefined") {
    chrome.storage.sync.set({
      isEnabled: true,
      hiddenPosts: {},
      showCards: true,
    });
  }
});

chrome.runtime.onSuspend.addListener(() => {
  isExtensionValid = false;
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      try {
        chrome.tabs.sendMessage(tab.id, { action: "cleanup" });
      } catch (error) {
        console.error("Error sending cleanup message:", error);
      }
    });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (!isExtensionValid) {
        sendResponse({ success: false, error: "Extension invalidated" });
        return;
      }

      switch (request.action) {
        case "hideVerifiedPost": {
          const isEnabled = await getData("isEnabled", false);
          if (!isEnabled) {
            sendResponse({ success: false, reason: "extension_disabled" });
            return;
          }

          const hiddenPosts = await getData("hiddenPosts", {});
          hiddenPosts[request.postId] = {
            username: request.username,
            timestamp: Date.now(),
          };
          await chrome.storage.sync.set({ hiddenPosts });
          sendResponse({ success: true });
          break;
        }

        case "showVerifiedPost": {
          const hiddenPosts = await getData("hiddenPosts", {});
          delete hiddenPosts[request.postId];
          await chrome.storage.sync.set({ hiddenPosts });
          sendResponse({ success: true });
          break;
        }

        case "getHiddenPosts": {
          const hiddenPosts = await getData("hiddenPosts", {});
          sendResponse({ hiddenPosts });
          break;
        }

        case "toggleExtension": {
          const currentState = await getData("isEnabled", false);
          await chrome.storage.sync.set({ isEnabled: !currentState });
          sendResponse({ success: true, isEnabled: !currentState });
          break;
        }
      }
    } catch (error) {
      console.error("Error in message handler:", error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true;
});

const getData = async (key, defaultValue) => {
  const value = await new Promise((resolve) => {
    chrome.storage.sync.get({ [key]: defaultValue }, (result) => {
      resolve(result[key]);
    });
  });
  return value;
};
