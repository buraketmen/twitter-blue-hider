import { TwitterSelectors, TwitterUsername } from "./constants";
import { scrollManager } from "./core/scroll-queue";

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

export const isVerifiedAccount = (element) => {
  return TwitterSelectors.verifiedBadge.some((selector) =>
    element.querySelector(selector)
  );
};

export const getTweetsFromElement = (element, suffix = "") => {
  if (!element) return [];

  const tweets = new Set();

  TwitterSelectors.tweet.forEach((selector) => {
    element.querySelectorAll(selector + suffix)?.forEach((tweet) => {
      if (tweet.isConnected) {
        tweets.add(tweet);
      }
    });
  });

  return Array.from(tweets);
};

export const isTweetProcessing = (tweet) => {
  return tweet.dataset.processing === "true";
};

export const handleElementVisibility = (element) => {
  if (!element || !element.isConnected) {
    return {
      afterChange: async () => {},
    };
  }

  const height = element.getBoundingClientRect().height;
  const elementPosition = scrollManager.getElementPosition(element);

  return {
    afterChange: async (newElement) => {
      if (!newElement?.isConnected) return;
      await scrollManager.adjustScroll({
        tweetHeight: height,
        newElementHeight: newElement.getBoundingClientRect().height,
        tweetElementPosition: elementPosition,
      });
    },
  };
};
