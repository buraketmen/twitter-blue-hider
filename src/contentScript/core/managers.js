import { chromeStorageGet, chromeStorageSet } from "../utils";

export const StorageManager = {
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
