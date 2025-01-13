import { debugLog } from "./utils";
import { TwitterSelectors } from "./constants";

export let isEnabled = true;
export const shownPosts = new Set();
let whitelistedUsers = new Set();

export const WhitelistManager = {
  async getWhitelistedUsers() {
    try {
      checkExtensionContext();
      const result = await chrome.storage.sync.get("whitelistedUsers");
      whitelistedUsers = new Set(result.whitelistedUsers || []);
      return whitelistedUsers;
    } catch (error) {
      debugLog(`Error getting whitelisted users: ${error.message}`);
      return new Set();
    }
  },

  async addUser(username) {
    try {
      checkExtensionContext();
      const users = await this.getWhitelistedUsers();
      users.add(username);
      await chrome.storage.sync.set({ whitelistedUsers: Array.from(users) });
      whitelistedUsers = users;
      debugLog(`Added user to whitelist: ${username}`);
    } catch (error) {
      debugLog(`Error adding user to whitelist: ${error.message}`);
    }
  },

  async removeUser(username) {
    try {
      checkExtensionContext();
      const users = await this.getWhitelistedUsers();
      users.delete(username);
      await chrome.storage.sync.set({ whitelistedUsers: Array.from(users) });
      whitelistedUsers = users;
      debugLog(`Removed user from whitelist: ${username}`);
    } catch (error) {
      debugLog(`Error removing user from whitelist: ${error.message}`);
    }
  },

  async isUserWhitelisted(username) {
    try {
      checkExtensionContext();
      const users = await this.getWhitelistedUsers();
      return users.has(username);
    } catch (error) {
      debugLog(`Error checking whitelist: ${error.message}`);
      return false;
    }
  },
};

export const cleanup = () => {
  if (window._twitterBlueHiderScrollHandler) {
    window.removeEventListener("scroll", window._twitterBlueHiderScrollHandler);
    delete window._twitterBlueHiderScrollHandler;
  }

  if (window._twitterBlueHiderMessageHandler) {
    chrome.runtime.onMessage.removeListener(
      window._twitterBlueHiderMessageHandler
    );
    delete window._twitterBlueHiderMessageHandler;
  }

  if (window._twitterBlueHiderObserver) {
    window._twitterBlueHiderObserver.disconnect();
    delete window._twitterBlueHiderObserver;
  }

  shownPosts.clear();
  whitelistedUsers.clear();
};

export const checkExtensionContext = () => {
  if (!chrome.runtime?.id) {
    throw new Error("Extension context invalidated");
  }
  return true;
};

chrome.storage.sync.get(["isEnabled"], (result) => {
  try {
    isEnabled = result.isEnabled ?? true;
    debugLog(`Initial state loaded: isEnabled=${isEnabled}`);
  } catch (error) {
    debugLog(`Error loading initial state: ${error.message}`);
  }
});

export const handleExtensionStateChange = async () => {
  try {
    checkExtensionContext();
    const result = await chrome.storage.sync.get(["showCards", "isEnabled"]);
    const wasEnabled = isEnabled;
    isEnabled = result.isEnabled ?? true;

    if (wasEnabled !== isEnabled) {
      debugLog(`Extension enabled state changed to: ${isEnabled}`);

      if (!isEnabled) {
        const hiddenTweets = document.querySelectorAll(
          `${TwitterSelectors.tweet}[style*="display: none"]`
        );
        hiddenTweets.forEach((tweet) => {
          tweet.style.display = "block";
          tweet.removeAttribute("data-processed");
        });

        const hiddenCards = document.querySelectorAll(
          TwitterSelectors.hiddenCard
        );
        hiddenCards.forEach((card) => card.remove());

        shownPosts.clear();

        cleanup();
      } else {
        const { observeTwitterFeed } = await import("./observers");
        window._twitterBlueHiderObserver = observeTwitterFeed();

        const { initScrollHandler } = await import("./index");
        initScrollHandler();

        const { processTwitterFeed } = await import("./processor");
        await processTwitterFeed();
      }
    } else if (result.showCards !== undefined) {
      const hiddenCards = document.querySelectorAll(
        TwitterSelectors.hiddenCard
      );
      hiddenCards.forEach((card) => {
        card.style.display = result.showCards ? "block" : "none";
      });
    }

    debugLog(
      `Extension state updated: showCards=${result.showCards}, isEnabled=${isEnabled}`
    );
  } catch (error) {
    debugLog(`Error handling extension state change: ${error.message}`);
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
};

chrome.storage.onChanged.addListener((changes) => {
  try {
    checkExtensionContext();
    if (changes.showCards || changes.isEnabled) {
      handleExtensionStateChange();
    }
  } catch (error) {
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
});
