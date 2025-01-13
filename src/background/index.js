// Extension'ın aktif olup olmadığını kontrol et
let isExtensionValid = true;

chrome.runtime.onInstalled.addListener(async () => {
  // İlk kurulumda storage'ı kontrol et
  const existingData = await getData("isEnabled");

  // Sadece ilk kurulumda default değeri set et
  if (typeof existingData === "undefined") {
    chrome.storage.sync.set({
      isEnabled: true,
      hiddenPosts: {},
      showCard: true,
    });
  }
});

// Extension geçersiz olduğunda
chrome.runtime.onSuspend.addListener(() => {
  isExtensionValid = false;
  // Tüm content script'lere haber ver
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
      // Extension geçersizse işlem yapma
      if (!isExtensionValid) {
        sendResponse({ success: false, error: "Extension invalidated" });
        return;
      }

      switch (request.action) {
        case "hideVerifiedPost": {
          // Önce extension'ın aktif olup olmadığını kontrol et
          const isEnabled = await getData("isEnabled", false);
          if (!isEnabled) {
            sendResponse({ success: false, reason: "extension_disabled" });
            return;
          }

          const hiddenPosts = await getData("hiddenPosts", {});
          hiddenPosts[request.postId] = {
            username: request.username,
            displayName: request.displayName,
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

// Helper function to get data from storage
const getData = async (key, defaultValue) => {
  const value = await new Promise((resolve) => {
    chrome.storage.sync.get({ [key]: defaultValue }, (result) => {
      resolve(result[key]);
    });
  });
  return value;
};
