import { TwitterSelectors, TwitterUsername } from "../constants";
import { debugLog, chromeStorageGet } from "../utils";
import { StorageManager } from "./managers";
import { createHiddenPostCard, addHideButtonToVisibleTweet } from "./twitter";

let visibilityObserver = null;
let mutationObserver = null;

const processTweet = async (tweet) => {
  try {
    const verifiedBadge = tweet.querySelector(TwitterSelectors.verifiedBadge);
    if (!verifiedBadge) {
      return;
    }

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

    tweet.setAttribute(TwitterSelectors.processedTweetTag, "true");
  } catch (error) {
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
      rootMargin: "200px",
      threshold: 0,
    }
  );
};

const setupMutationObserver = () => {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  mutationObserver = new MutationObserver((mutations) => {
    const newTweets = [];
    let mutationCount = 0;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tweets = [];

            if (node.matches(TwitterSelectors.tweet)) {
              tweets.push(node);
            }

            const nestedTweets = node.querySelectorAll
              ? node.querySelectorAll(TwitterSelectors.tweet)
              : [];

            tweets.push(...nestedTweets);

            tweets.forEach((tweet) => {
              if (!tweet.hasAttribute(TwitterSelectors.processedTweetTag)) {
                newTweets.push(tweet);
                mutationCount++;
              }
            });
          }
        });
      }
    });

    if (newTweets.length > 0) {
      newTweets.forEach((tweet) => {
        visibilityObserver.observe(tweet);
      });
    }
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

    debugLog("Starting Twitter feed processing");

    setupVisibilityObserver();
    setupMutationObserver();

    const processInitialTweets = async () => {
      const tweets = document.querySelectorAll(TwitterSelectors.tweet);

      tweets.forEach((tweet) => {
        visibilityObserver.observe(tweet);
      });

      if (tweets.length === 0) {
        setTimeout(processInitialTweets, 2000);
      }
    };

    await processInitialTweets();

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
};
