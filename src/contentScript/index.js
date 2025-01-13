const TwitterSelectors = {
  tweet: 'article[role="article"]',
  userName: '[data-testid="User-Name"]',
  verifiedBadge: 'svg[aria-label="Verified account"]',
  moreButton: '[data-testid="caret"]',
  tweetLink: 'a[href*="/status/"]',
  tweetContainer: '[data-testid="cellInnerDiv"]',
  tweetGroup: 'div[role="group"]',
  timestamp: "time",
  hiddenCard: ".hidden-verified-post",
};

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

const getStorageData = withErrorHandling(chromeStorageGet);

const sendMessageToBackground = (message) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
};

const generatePostId = (element) => {
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

// Add Twitter username utilities
const TwitterUsername = {
  // Clean and extract username from full username text
  extractClean: (fullUsername) => {
    if (!fullUsername) return null;
    const username = fullUsername.split("@")?.[1]?.split("·")?.[0]?.trim();
    return username || null;
  },

  getFromTweet: (tweet) => {
    const userNameElement = tweet.querySelector(TwitterSelectors.userName);
    if (!userNameElement) return null;
    return TwitterUsername.extractClean(userNameElement.textContent);
  },

  getFullUsername: (tweet) => {
    return (
      tweet.querySelector(TwitterSelectors.userName)?.textContent || "Unknown"
    );
  },
};

const isVerifiedPost = (element) => {
  const verifiedIcon = element.querySelector(TwitterSelectors.verifiedBadge);
  return !!verifiedIcon;
};

// Add function to manage whitelisted users
const WhitelistManager = {
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

// Add batch update and throttling for storage operations
const StorageManager = {
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

  // Add new method to remove all tweets from a user
  async removeUserTweets(username) {
    try {
      const { hiddenPosts } = await chrome.storage.sync.get("hiddenPosts");
      let hasChanges = false;

      // Remove all posts from this user
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

const updateHiddenCardVisibility = () => {
  const cards = document.querySelectorAll(TwitterSelectors.hiddenCard);
  cards.forEach((card) => {
    card.style.display = showCards ? "block" : "none";
  });
};

const addTooltip = (element, text) => {
  const tooltip = document.createElement("div");
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 13px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 1000;
    white-space: nowrap;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;
  tooltip.textContent = text;
  document.body.appendChild(tooltip);

  const updateTooltipPosition = (e) => {
    const rect = element.getBoundingClientRect();
    tooltip.style.top =
      rect.top - tooltip.offsetHeight - 8 + window.scrollY + "px";
    tooltip.style.left =
      rect.left + (rect.width - tooltip.offsetWidth) / 2 + "px";
  };

  const hideTooltip = () => {
    tooltip.style.opacity = "0";
  };

  const removeTooltip = () => {
    tooltip.remove();
    element.removeEventListener("mouseenter", showTooltip);
    element.removeEventListener("mouseleave", hideTooltip);
    element.removeEventListener("click", hideTooltip);
    observer.disconnect();
  };

  const showTooltip = (e) => {
    updateTooltipPosition(e);
    tooltip.style.opacity = "1";
  };

  element.addEventListener("mouseenter", showTooltip);
  element.addEventListener("mouseleave", hideTooltip);
  element.addEventListener("click", hideTooltip);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === element || node.contains(element)) {
          removeTooltip();
        }
      });
    });
  });

  observer.observe(element.parentElement || document.body, {
    childList: true,
    subtree: true,
  });

  element._removeTooltip = removeTooltip;
};

const createHideButton = (tweet, postId) => {
  const hideButton = document.createElement("div");
  hideButton.className = "tweet-hide-button";
  hideButton.setAttribute("role", "button");
  hideButton.style.cssText = `
    position: absolute;
    right: 32px;
    top: 0px;
    padding: 0px;
    color: #1DA1F2;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    z-index: 1;
  `;

  const textSpan = document.createElement("span");
  textSpan.textContent = "Hide";
  textSpan.style.cssText = `
    text-decoration: none;
    transition: text-decoration 0.2s ease;
  `;
  hideButton.appendChild(textSpan);

  hideButton.addEventListener("mouseenter", () => {
    textSpan.style.textDecoration = "underline";
  });

  hideButton.addEventListener("mouseleave", () => {
    textSpan.style.textDecoration = "none";
  });

  hideButton.addEventListener("click", async (e) => {
    e.stopPropagation();
    const username = TwitterUsername.getFromTweet(tweet);
    if (username) {
      await WhitelistManager.removeUser(username);
      tweet.style.display = "none";
      const newCard = createHiddenPostCard(tweet, postId);
      tweet.parentNode.insertBefore(newCard, tweet);
    }
  });

  addTooltip(
    hideButton,
    "Hide this user's tweets and remove them from whitelist"
  );

  return hideButton;
};

const addHideButtonToVisibleTweet = (tweet) => {
  if (!tweet.querySelector(".tweet-hide-button")) {
    const moreButton = tweet.querySelector(TwitterSelectors.moreButton);
    if (moreButton) {
      const hideButton = createHideButton(tweet, generatePostId(tweet));
      const tweetHeader =
        moreButton.closest(TwitterSelectors.tweetGroup) ||
        moreButton.parentElement;
      tweetHeader.style.position = "relative";
      tweetHeader.appendChild(hideButton);
    }
  }
};

const showAllTweetsFromUser = async (username) => {
  const hiddenCards = document.querySelectorAll(TwitterSelectors.hiddenCard);

  for (const card of hiddenCards) {
    const cardUsernameElement = card.querySelector(
      'span[style*="opacity: 0.5"]'
    );
    const cardUsername = TwitterUsername.extractClean(
      cardUsernameElement?.textContent
    );
    if (cardUsername === username) {
      const nextTweet = card.nextElementSibling;
      if (nextTweet && nextTweet.matches(TwitterSelectors.tweet)) {
        nextTweet.style.display = "block";

        if (!nextTweet.querySelector(".tweet-hide-button")) {
          const moreButton = nextTweet.querySelector(
            TwitterSelectors.moreButton
          );
          if (moreButton) {
            const hideButton = createHideButton(
              nextTweet,
              generatePostId(nextTweet)
            );
            const tweetHeader =
              moreButton.closest(TwitterSelectors.tweetGroup) ||
              moreButton.parentElement;
            tweetHeader.style.position = "relative";
            tweetHeader.appendChild(hideButton);
          }
        }

        card.remove();
      }
    }
  }
};

// Update createHiddenPostCard click handler
const createHiddenPostCard = (postElement, postId) => {
  const selectedUsername =
    postElement.querySelector(TwitterSelectors.userName)?.textContent ||
    "Unknown";

  const [name, rest] = selectedUsername.split("@");

  const card = document.createElement("div");
  card.className = TwitterSelectors.hiddenCard.replace(".", "");
  card.style.cssText = `
    padding: 16px;
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: ${showCards ? "block" : "none"};
  `;

  card.innerHTML = `
    <div style="display: flex; gap: 8px;">
        <div style="height:40px; width:40px; border-radius: 50%; background-color: gray;"></div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600;font-size: 15px;">${name}</span>
                <span style="font-weight: 100; opacity: 0.5;font-size: 15px;">@${rest}</span>
                <svg viewBox="0 0 24 24" width="16" height="16" style="margin-top: -2px;">
                    <path fill="#1DA1F2" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
                </svg>
            </div>
            <div style="display: flex; align-items: center; justify-content: center;">
                <button style="background-color: transparent; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #1DA1F2; height: 100%; display: flex; align-items: center;justify-content: center;">
                    <span style="text-decoration: none; transition: text-decoration 0.2s ease;">Show</span>
                </button>
            </div>
        
        </div>
    </div>
  `;

  const button = card.querySelector("button");
  const buttonText = button.querySelector("span");

  // Add hover effect to button text
  button.addEventListener("mouseenter", () => {
    buttonText.style.textDecoration = "underline";
  });

  button.addEventListener("mouseleave", () => {
    buttonText.style.textDecoration = "none";
  });

  // Add tooltip
  addTooltip(button, "Show this tweet and add user to whitelist");

  // Click event'i butona taşıyalım
  button.addEventListener("click", async () => {
    try {
      const username = TwitterUsername.getFromTweet(postElement);

      if (username) {
        // Add user to whitelist first
        await WhitelistManager.addUser(username);

        // Remove all tweets from this user from hidden posts
        await StorageManager.removeUserTweets(username);

        // Show all tweets from this user
        await showAllTweetsFromUser(username);
      }
    } catch (error) {
      debugLog(`Error showing post: ${error.message}`);
      postElement.style.display = "block";
      card.remove();
    }
  });

  return card;
};

const hasHiddenCard = (tweet) => {
  if (
    tweet.nextElementSibling?.classList.contains(
      TwitterSelectors.hiddenCard.replace(".", "")
    )
  ) {
    return true;
  }

  const tweetContainer = tweet.closest(TwitterSelectors.tweetContainer);
  if (tweetContainer?.querySelector(TwitterSelectors.hiddenCard)) {
    return true;
  }

  return false;
};

const processTwitterFeed = async () => {
  const isEnabled = await getStorageData("isEnabled", true);
  if (!isEnabled) return;

  const hiddenPosts = await getStorageData("hiddenPosts", {});

  // Get tweets that are in or near the viewport
  const tweets = Array.from(
    document.querySelectorAll(TwitterSelectors.tweet)
  ).filter((tweet) => {
    const rect = tweet.getBoundingClientRect();
    const buffer = window.innerHeight * 2; // Increase buffer for smoother experience
    return rect.top >= -buffer && rect.top <= window.innerHeight + buffer;
  });

  if (tweets.length === 0) return;

  const processedTweets = new Set();
  const updatePromises = [];

  // Process all tweets in a single batch
  for (const tweet of tweets) {
    const tweetId = tweet.getAttribute("aria-labelledby");
    if (processedTweets.has(tweetId)) continue;
    processedTweets.add(tweetId);

    const postId = generatePostId(tweet);
    if (shownPosts.has(postId)) continue;

    // Check if user is whitelisted
    const username = TwitterUsername.getFromTweet(tweet);
    if (username && (await WhitelistManager.isUserWhitelisted(username))) {
      addHideButtonToVisibleTweet(tweet);
      continue;
    }

    if (
      (hiddenPosts[postId] || isVerifiedPost(tweet)) &&
      !hiddenPosts[postId]
    ) {
      tweet.style.display = "none";

      if (!hasHiddenCard(tweet)) {
        const card = createHiddenPostCard(tweet, postId);
        tweet.parentNode.insertBefore(card, tweet);
      }

      if (!hiddenPosts[postId]) {
        updatePromises.push(
          StorageManager.addHiddenPost(postId, {
            username: TwitterUsername.getFullUsername(tweet),
            timestamp: Date.now(),
          })
        );
      }
    }
  }

  await Promise.all(updatePromises).catch((error) => {
    debugLog(`Batch update error: ${error.message}`);
  });
};

// Optimize scroll handling
let lastScrollY = window.scrollY;
let scrollTimeout = null;
let isProcessing = false;

window.addEventListener(
  "scroll",
  () => {
    if (scrollTimeout || isProcessing) return;

    // Only process if we've scrolled a significant amount
    const currentScrollY = window.scrollY;
    if (Math.abs(currentScrollY - lastScrollY) < 100) return;

    lastScrollY = currentScrollY;
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
  const THROTTLE_TIME = 250;

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
          mutation.target.closest(TwitterSelectors.tweet)) ||
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
  }, 2000);
};

// Storage cleanup function
const cleanupStorage = async () => {
  try {
    const { hiddenPosts = {} } = await chrome.storage.sync.get("hiddenPosts");

    // Find post IDs only on current page
    const currentPagePosts = Array.from(
      document.querySelectorAll(TwitterSelectors.tweet)
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

// Add message listener for whitelist clearing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "REFRESH_FEED") {
    processTwitterFeed();
  }
});

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
