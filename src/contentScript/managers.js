import { chromeStorageGet, chromeStorageSet, debugLog } from "./utils";
import { TwitterUsername } from "./twitter";

export const WhitelistManager = {
  async getWhitelistedUsers() {
    return await chromeStorageGet("whitelistedUsers", []);
  },

  async addUser(username) {
    const whitelistedUsers = await this.getWhitelistedUsers();
    if (!whitelistedUsers.includes(username)) {
      whitelistedUsers.push(username);
      await chromeStorageSet({ whitelistedUsers });
    }
  },

  async removeUser(username) {
    const whitelistedUsers = await this.getWhitelistedUsers();
    const updatedList = whitelistedUsers.filter((u) => u !== username);
    await chromeStorageSet({ whitelistedUsers: updatedList });
  },

  async isUserWhitelisted(username) {
    const whitelistedUsers = await this.getWhitelistedUsers();
    return whitelistedUsers.includes(username);
  },
};

export const StorageManager = {
  pendingUpdates: {},
  updateTimeout: null,
  BATCH_DELAY: 2000,

  async addHiddenPost(postId, postData) {
    const username = TwitterUsername.extractClean(postData.username);
    if (username) {
      postData.username_clean = username;
    }
    this.pendingUpdates[postId] = postData;
    this.scheduleBatchUpdate();
  },

  scheduleBatchUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(async () => {
      await this.commitUpdates();
    }, this.BATCH_DELAY);
  },

  async commitUpdates() {
    if (Object.keys(this.pendingUpdates).length === 0) return;

    try {
      const hiddenPosts = await chromeStorageGet("hiddenPosts", {});

      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      Object.keys(hiddenPosts).forEach((key) => {
        if (hiddenPosts[key].timestamp < twoHoursAgo) {
          delete hiddenPosts[key];
        }
      });

      Object.assign(hiddenPosts, this.pendingUpdates);

      await chromeStorageSet({ hiddenPosts });

      this.pendingUpdates = {};
    } catch (error) {
      debugLog(`Storage update error: ${error.message}`);
    }
  },

  async removeUserTweets(username) {
    try {
      const { hiddenPosts } = await chrome.storage.sync.get("hiddenPosts");
      let hasChanges = false;

      Object.keys(hiddenPosts).forEach((postId) => {
        if (hiddenPosts[postId].username_clean === username) {
          delete hiddenPosts[postId];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await chrome.storage.sync.set({ hiddenPosts });
      }
    } catch (error) {
      debugLog(`Error removing user tweets: ${error.message}`);
    }
  },
};
