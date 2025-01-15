import { TwitterSelectors, TwitterUsername } from "../constants";
import {
  debugLog,
  chromeStorageGet,
  isVerifiedAccount,
  getTweetsFromElement,
  handleTweetVisibility,
  isTweetProcessing,
} from "../utils";
import { tweetQueue } from "./task-queue";
import { StorageManager } from "./managers";
import { createHiddenPostCard, addHideButtonToVisibleTweet } from "./twitter";

let tweetObserver = null;
let visibleTweetsObserver = null;

const processTweet = async (tweet) => {
  try {
    if (tweet.dataset.processed === "true" || isTweetProcessing(tweet)) {
      return;
    }

    tweet.dataset.processing = "true";

    const { handler } = await handleTweetVisibility(tweet);

    await tweetQueue.add(async () => {
      const isVerified = isVerifiedAccount(tweet);
      if (!isVerified) {
        tweet.dataset.processed = "true";
        tweet.dataset.processing = "false";
        return;
      }

      const username = TwitterUsername.getFromTweet(tweet);
      const isWhitelisted = await StorageManager.isUserWhitelisted(username);

      if (!isWhitelisted) {
        const createdHiddenCard = await createHiddenPostCard(tweet);
        if (createdHiddenCard && tweet.isConnected) {
          createdHiddenCard.style.opacity = "0";
          tweet.style.opacity = "0";
          tweet.parentNode.insertBefore(createdHiddenCard, tweet);

          await new Promise((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                tweet.style.display = "none";
                createdHiddenCard.style.opacity = "1";
                handler.afterChange(createdHiddenCard);
                tweet.dataset.processed = "true";
                tweet.dataset.processing = "false";
                resolve();
              });
            });
          });
        }
      } else {
        const hiddenCard = tweet.previousElementSibling;
        if (hiddenCard?.matches?.(`.${TwitterSelectors.hiddenCardClass}`)) {
          hiddenCard.style.opacity = "0";
          tweet.style.display = "block";

          requestAnimationFrame(() => {
            hiddenCard.remove();
            handler.afterChange(tweet);
            tweet.dataset.processing = "false";
          });
        }

        addHideButtonToVisibleTweet(tweet);
        tweet.dataset.processing = "false";
      }
    });
  } catch (error) {
    tweet.dataset.processing = "false";
  }
};

const processTweetBatch = async (tweets) => {
  for (const tweet of tweets) {
    await processTweet(tweet);
  }
};

const setupObserver = () => {
  if (tweetObserver || visibleTweetsObserver) {
    return visibleTweetsObserver;
  }

  visibleTweetsObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries.filter(
        (entry) =>
          entry.target.matches?.(TwitterSelectors.tweet) &&
          entry.isIntersecting &&
          !entry.target.dataset.processed
      );

      if (visibleEntries.length) {
        visibleEntries.forEach((entry) => {
          requestIdleCallback(() => processTweet(entry.target), {
            timeout: 1000,
          });
        });
      }
    },
    {
      rootMargin: "150px 0px",
      threshold: 0.1,
    }
  );

  tweetObserver = new MutationObserver((mutations) => {
    const newTweets = new Set();

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches?.(TwitterSelectors.tweet)) {
            newTweets.add(node);
          }

          node.querySelectorAll?.(TwitterSelectors.tweet)?.forEach((tweet) => {
            newTweets.add(tweet);
          });
        }
      });
    });

    newTweets.forEach((tweet) => {
      if (!tweet.dataset.observed) {
        tweet.dataset.observed = "true";
        visibleTweetsObserver.observe(tweet);
      }
    });
  });

  tweetObserver.observe(document, {
    childList: true,
    subtree: true,
  });

  getTweetsFromElement(document).forEach((tweet) => {
    if (!tweet.dataset.observed) {
      tweet.dataset.observed = "true";
      visibleTweetsObserver.observe(tweet);
    }
  });

  return visibleTweetsObserver;
};

const hideTweetsFromUser = async (username, tweet) => {
  if (!tweet || !username) return;

  const allTweets = getTweetsFromElement(document, "");
  tweet.dataset.processed = "false";
  tweet.style.display = "block";
  const hideButton = tweet.querySelector(
    `.${TwitterSelectors.hideButtonClass}`
  );
  if (hideButton) {
    hideButton.remove();
  }

  allTweets.forEach((tweet) => {
    const tweetUsername = TwitterUsername.getFromTweet(tweet);
    if (tweetUsername === username) {
      tweet.dataset.processed = "false";
    }
  });

  await processTweet(tweet);
};

const showTweetsFromUser = async (username, tweet) => {
  if (!tweet || !username) return;
  await StorageManager.addUser(username);
  const allTweets = getTweetsFromElement(document, "");

  tweet.style.display = "block";
  tweet.dataset.processed = "false";
  const showCards = await chromeStorageGet("showCards", true);
  const hiddenCard = tweet.previousElementSibling;
  if (hiddenCard?.matches?.(`.${TwitterSelectors.hiddenCardClass}`)) {
    if (showCards) {
      hiddenCard.style.display = "block";
    } else {
      hiddenCard.remove();
    }
  }

  allTweets.forEach((tweet) => {
    const tweetUsername = TwitterUsername.getFromTweet(tweet);
    if (tweetUsername === username) {
      tweet.dataset.processed = "false";
    }
  });

  await processTweet(tweet);
};

document.addEventListener(
  "hideTweetsFromUser",
  (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideTweetsFromUser(e.detail.username, e.detail.tweet);
  },
  { once: false }
);

document.addEventListener("showTweetsFromUser", (e) => {
  e.preventDefault();
  e.stopPropagation();
  showTweetsFromUser(e.detail.username, e.detail.tweet);
});

export const processTwitterFeed = async () => {
  try {
    const isEnabled = await chromeStorageGet("isEnabled", true);
    if (!isEnabled) return;

    debugLog("Starting Twitter feed processing");
    setupObserver();
    const tweets = getTweetsFromElement(document, "");
    if (tweets.length > 0) {
      await processTweetBatch(tweets);
      setupObserver();
    } else {
      setTimeout(() => processTwitterFeed(), 2000);
    }

    const showCards = await chromeStorageGet("showCards", true);
    const hiddenCards = document.querySelectorAll(
      `.${TwitterSelectors.hiddenCardClass}`
    );
    hiddenCards.forEach((card) => {
      card.style.display = showCards ? "block" : "none";
    });
  } catch (error) {
    debugLog(`Error processing Twitter feed: ${error.message}`);
  }
};

export const cleanupProcessor = () => {
  tweetQueue.clear();

  if (tweetObserver) {
    tweetObserver.disconnect();
    tweetObserver = null;
  }

  if (visibleTweetsObserver) {
    const observedTweets = document.querySelectorAll('[data-observed="true"]');
    observedTweets.forEach((tweet) => {
      tweet.dataset.observed = "false";
      tweet.dataset.processed = "false";
      tweet.dataset.processing = "false";
    });

    visibleTweetsObserver.disconnect();
    visibleTweetsObserver = null;
  }
};
