import { TwitterSelectors } from "./constants";
import { TwitterUsername } from "./core/twitter";

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
          .slice(0, 100)
          .replace(/[^\w\s-]/g, "")
          .trim()
          .toLowerCase()
      : "";

    const hashStr = `${username || "unknown"}-${text}`;
    let hash = 0;
    for (let i = 0; i < hashStr.length; i++) {
      const char = hashStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `hash-${Math.abs(hash).toString(36)}`;
  } catch (error) {
    debugLog(`Error generating postId: ${error.message}`);
    return `time-${Date.now().toString(36)}`;
  }
};

export const isVerifiedPost = (element) => {
  const verifiedIcon = element.querySelector(TwitterSelectors.verifiedBadge);
  return !!verifiedIcon;
};
