import { TwitterSelectors } from "../constants";
import { debugLog, chromeStorageGet, generatePostId } from "../utils";
import { StorageManager } from "./managers";
import {
  createHiddenPostCard,
  addHideButtonToVisibleTweet,
  TwitterUsername,
} from "./twitter";

let visibilityObserver = null;
let mutationObserver = null;
const processedTweetIds = new Set();

const processTweet = async (tweet) => {
  try {
    const tweetId = generatePostId(tweet);
    const verifiedBadge = tweet.querySelector(TwitterSelectors.verifiedBadge);
    if (!verifiedBadge) return;

    const username = TwitterUsername.getFromTweet(tweet);
    const isWhitelisted =
      username && (await StorageManager.isUserWhitelisted(username));

    if (!isWhitelisted) {
      tweet.style.display = "none";

      const hasHiddenCard = tweet.previousElementSibling?.matches?.(
        TwitterSelectors.hiddenCard
      );
      if (!hasHiddenCard) {
        const hiddenCard = await createHiddenPostCard(tweet);
        tweet.parentNode.insertBefore(hiddenCard, tweet);
      }
    } else {
      tweet.style.display = "block";
      addHideButtonToVisibleTweet(tweet);
    }

    processedTweetIds.add(tweetId);
    tweet.setAttribute(TwitterSelectors.processedTweetTag, "true");
  } catch (error) {
    debugLog(`Error processing tweet: ${error.message}`);
    tweet.style.display = "none";
  }
};

const setupVisibilityObserver = () => {
  if (visibilityObserver) {
    visibilityObserver.disconnect();
  }

  visibilityObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          processTweet(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    }
  );
};

const setupMutationObserver = () => {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tweets = node.querySelectorAll(TwitterSelectors.tweet);
          tweets.forEach((tweet) => {
            visibilityObserver.observe(tweet);
          });
        }
      });
    });
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

export const processTwitterFeed = async () => {
  try {
    const isEnabled = await chromeStorageGet("isEnabled", true);
    if (!isEnabled) return;

    setupVisibilityObserver();
    setupMutationObserver();

    const tweets = document.querySelectorAll(TwitterSelectors.tweet);
    tweets.forEach((tweet) => {
      if (!tweet.hasAttribute(TwitterSelectors.processedTweetTag)) {
        visibilityObserver.observe(tweet);
      }
    });

    const showCards = await chromeStorageGet("showCards", true);
    const hiddenCards = document.querySelectorAll(TwitterSelectors.hiddenCard);
    hiddenCards.forEach((card) => {
      card.style.display = showCards ? "block" : "none";
    });
  } catch (error) {
    debugLog(`Error processing Twitter feed: ${error.message}`);
    if (error.message.includes("Extension context invalidated")) {
      cleanupProcessor();
      throw error;
    }
  }
};

export const cleanupProcessor = () => {
  if (visibilityObserver) {
    visibilityObserver.disconnect();
    visibilityObserver = null;
  }
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  processedTweetIds.clear();
};
