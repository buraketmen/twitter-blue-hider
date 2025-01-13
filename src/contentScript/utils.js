import { TwitterSelectors } from "./constants";
import { cleanup } from "./state";

export const debugLog = (message) => {
  console.log(`[Twitter Blue Hider]: ${message}`);
};

export const withErrorHandling = (fn) => {
  return (...args) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          if (error.message.includes("Extension context invalidated")) {
            debugLog("Extension context invalidated, cleaning up...");
            cleanup();
            return;
          }
          throw error;
        });
      }
      return result;
    } catch (error) {
      if (error.message.includes("Extension context invalidated")) {
        debugLog("Extension context invalidated, cleaning up...");
        cleanup();
        return;
      }
      throw error;
    }
  };
};

export const chromeStorageGet = (key, defaultValue) => {
  try {
    return new Promise((resolve, reject) => {
      if (!chrome.runtime?.id) {
        reject(new Error("Extension context invalidated"));
        return;
      }

      chrome.storage.sync.get({ [key]: defaultValue }, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result[key]);
      });
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

export const chromeStorageSet = (data) => {
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

export const getStorageData = withErrorHandling(chromeStorageGet);

export const generatePostId = (element) => {
  try {
    const tweetLink = element.querySelector(TwitterSelectors.tweetLink)?.href;
    if (tweetLink) {
      const match = tweetLink.match(/status\/(\d+)/);
      if (match?.[1]) {
        return `tweet-${match[1]}`;
      }
    }

    const timestamp = element.querySelector("time")?.dateTime || Date.now();
    const text = element.textContent
      .slice(0, 50)
      .replace(/[^\w\s-]/g, "")
      .trim()
      .toLowerCase();

    const hashStr = `${timestamp}-${text}`;
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
