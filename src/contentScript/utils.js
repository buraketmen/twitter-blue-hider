import { TwitterSelectors, TwitterUsername } from "./constants";

export const debugLog = (message) => {
  console.log(`[Twitter Blue Hider]: ${message}`);
};

export const chromeStorageGet = async (key, defaultValue) => {
  try {
    return new Promise((resolve, reject) => {
      if (!chrome.runtime?.id) {
        resolve(defaultValue);
        return;
      }

      chrome.storage.sync.get({ [key]: defaultValue }, (result) => {
        if (chrome.runtime.lastError) {
          resolve(defaultValue);
          return;
        }
        resolve(result[key]);
      });
    });
  } catch (error) {
    return Promise.reject(defaultValue);
  }
};

export const chromeStorageSet = async (data) => {
  try {
    return new Promise((resolve, reject) => {
      if (!chrome.runtime?.id) {
        reject(new Error("Extension context invalidated"));
        return;
      }

      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

export const generatePostId = (element) => {
  try {
    const username = TwitterUsername.getFromTweet(element);
    const tweetTextElement = element.querySelector(TwitterSelectors.tweetText);
    const text = tweetTextElement
      ? tweetTextElement.textContent
          .slice(0, 300)
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase()
      : "";

    const hashStr = `${username || "unknown"}-${text}`;
    let hash1 = 0,
      hash2 = 0,
      hash3 = 0;

    for (let i = 0; i < hashStr.length; i++) {
      const char = hashStr.charCodeAt(i);

      hash1 = (hash1 << 5) - hash1 + char;
      hash1 = hash1 & 0x7fffffff;

      hash2 = (hash2 << 7) - hash2 + char * 31;
      hash2 = hash2 & 0x7fffffff;

      hash3 = (hash3 << 3) - hash3 + char * 17;
      hash3 = hash3 & 0x7fffffff;
    }

    const combinedHash = `${hash1}-${hash2}-${hash3}`;

    return `hash-${combinedHash.toString(36)}`;
  } catch (error) {
    return `time-${Date.now().toString(36)}`;
  }
};

export const isVerifiedPost = (element) => {
  const verifiedIcon = element.querySelector(TwitterSelectors.verifiedBadge);
  return !!verifiedIcon;
};
