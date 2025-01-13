const debugLog = (message) => {
  console.log(`[Twitter Blue Hider]: ${message}`);
};

const withErrorHandling = (fn) => {
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

const chromeStorageGet = (key, defaultValue) => {
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

const chromeStorageSet = (data) => {
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

// Update getStorageData to use error handling
const getStorageData = withErrorHandling(chromeStorageGet);

// Convert message sending to Promise
const sendMessageToBackground = (message) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
};

// Utility function to generate unique ID for posts
const generatePostId = (element) => {
  try {
    // Find tweet id
    const tweetLink = element.querySelector('a[href*="/status/"]')?.href;
    if (tweetLink) {
      const match = tweetLink.match(/status\/(\d+)/);
      if (match?.[1]) {
        return `tweet-${match[1]}`;
      }
    }

    // Use fallback hash
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

// Function to check if an element is a verified post
const isVerifiedPost = (element) => {
  // Check verified account svg more specific
  const verifiedIcon = element.querySelector(
    'svg[aria-label="Verified account"]'
  );
  return !!verifiedIcon;
};

// Add batch update and throttling for storage operations
const StorageManager = {
  pendingUpdates: {},
  updateTimeout: null,
  BATCH_DELAY: 2000, // Wait 2 seconds and commit updates

  // Add post for batch update
  async addHiddenPost(postId, postData) {
    this.pendingUpdates[postId] = postData;
    this.scheduleBatchUpdate();
  },

  // Schedule batch update
  scheduleBatchUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(async () => {
      await this.commitUpdates();
    }, this.BATCH_DELAY);
  },

  // Commit updates to storage
  async commitUpdates() {
    if (Object.keys(this.pendingUpdates).length === 0) return;

    try {
      const hiddenPosts = await chromeStorageGet("hiddenPosts", {});

      // Clear old records
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      Object.keys(hiddenPosts).forEach((key) => {
        if (hiddenPosts[key].timestamp < twoHoursAgo) {
          delete hiddenPosts[key];
        }
      });

      // Add new records
      Object.assign(hiddenPosts, this.pendingUpdates);

      // Update storage
      await chromeStorageSet({ hiddenPosts });

      // Clear pending updates
      this.pendingUpdates = {};
    } catch (error) {
      debugLog(`Storage update error: ${error.message}`);
    }
  },
};

// Track shown posts
const shownPosts = new Set();
let showCards = true; // Default show cards

// Get showCard setting from storage and listen for changes
chrome.storage.sync.get({ showCard: true }, (result) => {
  showCards = result.showCard;
  updateHiddenCardVisibility();
});

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes) => {
  if (changes.showCard) {
    showCards = changes.showCard.newValue;
    updateHiddenCardVisibility();
  }
});

// Update visibility of all hidden cards
const updateHiddenCardVisibility = () => {
  const cards = document.querySelectorAll(".hidden-verified-post");
  cards.forEach((card) => {
    card.style.display = showCards ? "block" : "none";
  });
};

// Function to create replacement card
const createHiddenPostCard = (postElement, postId) => {
  const selectedUsername =
    postElement.querySelector('[data-testid="User-Name"]')?.textContent ||
    "Unknown";

  const [name, rest] = selectedUsername.split("@");

  const card = document.createElement("div");
  card.className = "hidden-verified-post";
  card.style.cssText = `
    padding: 16px;
    cursor: pointer;
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: ${showCards ? "block" : "none"};
  `;

  card.innerHTML = `
    <div style="display: flex; gap: 8px;">
        <div style="height:40px; width:40px; border-radius: 50%; background-color: gray;"></div>
        <div style="display: flex; flex-direction: column; gap: 4px;width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600;font-size: 15px;">${name}</span>
                <span style="opacity: 0.5;font-size: 15px;">${rest}</span>
                <svg viewBox="0 0 24 24" width="16" height="16" style="margin-top: -2px;">
                    <path fill="#1DA1F2" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
                </svg>
            </div>
            <div style="font-size: 15px;font-weight: 600; margin-top: 4px; height: 32px; display: flex; align-items: center;justify-content: center;margin-left:-48px;">
                <button style="background-color: transparent; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #1DA1F2; margin-top: 4px; height: 32px; display: flex; align-items: center;justify-content: center;">
                Click to show the post
                </button>
            </div>
        </div>
    </div>
  `;

  // Click event'i aynı kalıyor
  card.addEventListener("click", async () => {
    try {
      const { hiddenPosts } = await chrome.storage.sync.get("hiddenPosts");
      delete hiddenPosts[postId];
      await chrome.storage.sync.set({ hiddenPosts });

      // Gösterilen tweet'i kaydet
      shownPosts.add(postId);

      postElement.style.display = "block";
      card.remove();
    } catch (error) {
      debugLog(`Error showing post: ${error.message}`);
      postElement.style.display = "block";
      card.remove();
    }
  });

  return card;
};

// Function to check if a tweet already has a card
const hasHiddenCard = (tweet) => {
  // Check direct next sibling
  if (tweet.nextElementSibling?.classList.contains("hidden-verified-post")) {
    return true;
  }

  // Check parent elements for card
  const tweetContainer = tweet.closest('[data-testid="cellInnerDiv"]');
  if (tweetContainer?.querySelector(".hidden-verified-post")) {
    return true;
  }

  return false;
};

// Main function to process Twitter feed
const processTwitterFeed = async () => {
  debugLog("Processing Twitter feed...");

  const isEnabled = await getStorageData("isEnabled", true);
  if (!isEnabled) {
    debugLog("Extension is disabled");
    return;
  }

  // Get hidden posts from storage
  const hiddenPosts = await getStorageData("hiddenPosts", {});

  const scrollPos = {
    top: window.scrollY,
    height: document.documentElement.scrollHeight,
  };

  const tweets = Array.from(
    document.querySelectorAll('article[role="article"]')
  ).filter((tweet) => {
    const rect = tweet.getBoundingClientRect();
    const buffer = window.innerHeight / 2;
    return (
      rect.top >= -(rect.height + buffer) &&
      rect.top <= window.innerHeight + buffer
    );
  });

  if (tweets.length === 0) return;

  // Track processed tweets
  const processedTweets = new Set();

  const updatePromises = [];

  for (const tweet of tweets) {
    const tweetId = tweet.getAttribute("aria-labelledby");
    if (processedTweets.has(tweetId)) continue;
    processedTweets.add(tweetId);

    const postId = generatePostId(tweet);
    if (shownPosts.has(postId)) continue;

    // If tweet was hidden before and still visible, hide it again
    if (hiddenPosts[postId] && tweet.style.display !== "none") {
      tweet.style.display = "none";
      if (!hasHiddenCard(tweet)) {
        const card = createHiddenPostCard(tweet, postId);
        requestAnimationFrame(() => {
          tweet.parentNode.insertBefore(card, tweet);
        });
      }
      continue;
    }

    // Hide new blue ticked tweet
    if (isVerifiedPost(tweet) && !hiddenPosts[postId]) {
      try {
        tweet.style.display = "none";
        if (!hasHiddenCard(tweet)) {
          const card = createHiddenPostCard(tweet, postId);
          requestAnimationFrame(() => {
            tweet.parentNode.insertBefore(card, tweet);
          });
        }

        updatePromises.push(
          StorageManager.addHiddenPost(postId, {
            username:
              tweet.querySelector('[data-testid="User-Name"]')?.textContent ||
              "Unknown",
            displayName:
              tweet.querySelector('[data-testid="UserName"]')?.textContent ||
              "@unknown",
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        debugLog(`Error processing tweet: ${error.message}`);
        tweet.style.display = "block";
      }
    }
  }

  // Wait for all updates to complete
  await Promise.all(updatePromises).catch((error) => {
    debugLog(`Batch update error: ${error.message}`);
  });

  // Scroll pozisyonunu koru
  requestAnimationFrame(() => {
    const heightDiff = document.documentElement.scrollHeight - scrollPos.height;
    if (heightDiff !== 0) {
      window.scrollTo({
        top: scrollPos.top + heightDiff,
        behavior: "instant",
      });
    }
  });
};

// Throttle scroll event
let scrollTimeout = null;
let isProcessing = false;

window.addEventListener(
  "scroll",
  () => {
    if (scrollTimeout || isProcessing) return;

    scrollTimeout = setTimeout(() => {
      isProcessing = true;
      processTwitterFeed().finally(() => {
        isProcessing = false;
        scrollTimeout = null;
      });
    }, 150);
  },
  { passive: true }
);

// Optimize observer
const observeTwitterFeed = () => {
  debugLog("Starting Twitter feed observer...");

  let timeout = null;
  let lastProcessTime = 0;
  const THROTTLE_TIME = 500;

  const observer = new MutationObserver((mutations) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    const now = Date.now();
    if (now - lastProcessTime < THROTTLE_TIME) {
      timeout = setTimeout(() => {
        processTwitterFeed();
        lastProcessTime = Date.now();
      }, THROTTLE_TIME);
      return;
    }

    const shouldProcess = mutations.some(
      (mutation) =>
        (mutation.addedNodes.length > 0 &&
          mutation.target.closest('article[role="article"]')) ||
        (mutation.type === "attributes" &&
          mutation.target.tagName === "ARTICLE")
    );

    if (shouldProcess) {
      processTwitterFeed();
      lastProcessTime = now;
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  // Periodic check with less frequency
  setInterval(() => {
    processTwitterFeed();
  }, 5000);
};

// Storage cleanup function
const cleanupStorage = async () => {
  try {
    const { hiddenPosts = {} } = await chrome.storage.sync.get("hiddenPosts");

    // Find post IDs only on current page
    const currentPagePosts = Array.from(
      document.querySelectorAll('article[role="article"]')
    ).map((tweet) => generatePostId(tweet));

    // Clean up posts not on current page
    const updatedPosts = {};
    Object.entries(hiddenPosts).forEach(([postId, postData]) => {
      if (currentPagePosts.includes(postId)) {
        updatedPosts[postId] = postData;
      }
    });

    await chrome.storage.sync.set({ hiddenPosts: updatedPosts });
    debugLog(
      `Storage cleaned up. Remaining posts: ${Object.keys(updatedPosts).length}`
    );
  } catch (error) {
    debugLog(`Cleanup error: ${error.message}`);
  }
};

// Cleanup function
const cleanup = () => {
  try {
    // Clear all intervals and timeouts
    if (window._twitterBlueHiderTimeouts) {
      window._twitterBlueHiderTimeouts.forEach((id) => clearTimeout(id));
      window._twitterBlueHiderTimeouts.clear();
    }

    // Disconnect observers
    if (window._twitterBlueHiderObservers) {
      window._twitterBlueHiderObservers.forEach((observer) =>
        observer.disconnect()
      );
      window._twitterBlueHiderObservers.clear();
    }
  } catch (error) {
    debugLog(`Cleanup error: ${error.message}`);
  }
};

// Track timeouts and observers
window._twitterBlueHiderTimeouts = new Set();
window._twitterBlueHiderObservers = new Set();

// Update observer creation
const createObserver = (callback, options) => {
  const observer = new MutationObserver(callback);
  window._twitterBlueHiderObservers.add(observer);
  return observer;
};

// Update setTimeout usage
const safeSetTimeout = (callback, delay) => {
  const timeoutId = setTimeout(callback, delay);
  window._twitterBlueHiderTimeouts.add(timeoutId);
  return timeoutId;
};

// Initialize with error handling
const init = () => {
  try {
    if (!chrome.runtime?.id) {
      throw new Error("Extension context invalidated");
    }

    debugLog("Initializing extension...");
    processTwitterFeed()
      .then(() => observeTwitterFeed())
      .catch((error) => {
        debugLog(`Initialization error: ${error.message}`);
        if (error.message.includes("Extension context invalidated")) {
          cleanup();
        }
      });
  } catch (error) {
    debugLog(`Init error: ${error.message}`);
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
};

init();
