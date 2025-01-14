import { TwitterSelectors, TwitterUsername } from "../constants";
import {
  debugLog,
  chromeStorageGet,
  generatePostId,
  isVerifiedAccount,
  getTweetsFromElement,
} from "../utils";
import { StorageManager } from "./managers";
import { createHiddenPostCard, addHideButtonToVisibleTweet } from "./twitter";

let tweetObserver = null;
const processedTweets = new Set();

const processTweet = async (tweet) => {
  const tweetId = generatePostId(tweet);
  try {
    if (processedTweets.has(tweetId)) {
      return;
    }

    processedTweets.add(tweetId);

    const isVerified = isVerifiedAccount(tweet);
    if (!isVerified) {
      return;
    }

    const username = TwitterUsername.getFromTweet(tweet);
    const isWhitelisted = await StorageManager.isUserWhitelisted(username);

    if (!isWhitelisted) {
      if (!tweet.isConnected || !tweet.parentNode) {
        processedTweets.delete(tweetId);
        return;
      }

      const previousSibling = tweet.previousElementSibling;
      if (
        previousSibling?.matches?.(
          `.${TwitterSelectors.hiddenCard.replace(".", "")}`
        )
      ) {
        tweet.style.display = "none";
        return;
      }

      try {
        const hiddenCard = await createHiddenPostCard(tweet);

        if (tweet.isConnected && tweet.parentNode && hiddenCard) {
          tweet.parentNode.insertBefore(hiddenCard, tweet);
          tweet.style.display = "none";
        } else {
          processedTweets.delete(tweetId);
        }
      } catch (error) {
        processedTweets.delete(tweetId);
      }
    } else {
      tweet.style.display = "block";
      addHideButtonToVisibleTweet(tweet);
    }
  } catch (error) {
    if (tweetId) {
      processedTweets.delete(tweetId);
    }
  }
};

const setupObserver = () => {
  if (tweetObserver) {
    tweetObserver.disconnect();
  }

  const feedElement = document.querySelector(TwitterSelectors.feed);
  if (!feedElement) {
    return null;
  }

  tweetObserver = new MutationObserver(() => {
    const tweets = getTweetsFromElement(document);
    tweets.forEach(processTweet);
  });

  tweetObserver.observe(feedElement, {
    childList: true,
    subtree: true,
  });

  return tweetObserver;
};

const hideTweetsFromUser = async (username) => {
  const allTweets = getTweetsFromElement(document, "");

  allTweets.forEach((tweet) => {
    const tweetUsername = TwitterUsername.getFromTweet(tweet);
    if (tweetUsername === username) {
      const tweetId = generatePostId(tweet);
      processedTweets.delete(tweetId);
      const hideButton = tweet.querySelector(
        `.${TwitterSelectors.hideButtonClass}`
      );
      if (hideButton) {
        hideButton.remove();
      }
    }
  });

  for (const tweet of allTweets) {
    const tweetUsername = TwitterUsername.getFromTweet(tweet);
    if (tweetUsername === username) {
      tweet.style.display = "none";
      await processTweet(tweet);
    }
  }

  setTimeout(() => {
    const remainingTweets = getTweetsFromElement(document, "");
    remainingTweets.forEach((tweet) => {
      const tweetUsername = TwitterUsername.getFromTweet(tweet);
      if (tweetUsername === username) {
        tweet.style.display = "none";
        const hideButton = tweet.querySelector(
          `.${TwitterSelectors.hideButtonClass}`
        );
        if (hideButton) {
          hideButton.remove();
        }
      }
    });
  }, 500);
};

const showTweetsFromUser = async (username) => {
  await StorageManager.addUser(username);

  const allTweets = getTweetsFromElement(document, "");

  allTweets.forEach((tweet) => {
    const tweetUsername = TwitterUsername.getFromTweet(tweet);
    if (tweetUsername === username) {
      const tweetId = generatePostId(tweet);
      processedTweets.delete(tweetId);
    }
  });

  const hiddenCards = document.querySelectorAll(TwitterSelectors.hiddenCard);
  hiddenCards.forEach((card) => {
    const cardUsername = TwitterUsername.extractClean(
      card.querySelector(TwitterSelectors.cardUsername)?.textContent
    );
    if (cardUsername === username) {
      card.remove();
    }
  });

  for (const tweet of allTweets) {
    const tweetUsername = TwitterUsername.getFromTweet(tweet);
    if (tweetUsername === username) {
      const tweetId = generatePostId(tweet);
      processedTweets.add(tweetId);
      tweet.style.display = "block";
      const existingButton = tweet.querySelector(
        `.${TwitterSelectors.hideButtonClass}`
      );
      if (existingButton) {
        existingButton.remove();
      }
      addHideButtonToVisibleTweet(tweet);
    }
  }

  setTimeout(() => {
    const remainingTweets = getTweetsFromElement(document, "");
    remainingTweets.forEach((tweet) => {
      const tweetUsername = TwitterUsername.getFromTweet(tweet);
      if (tweetUsername === username) {
        const tweetId = generatePostId(tweet);
        processedTweets.add(tweetId);
        tweet.style.display = "block";
        const existingButton = tweet.querySelector(
          `.${TwitterSelectors.hideButtonClass}`
        );
        if (existingButton) {
          existingButton.remove();
        }
        addHideButtonToVisibleTweet(tweet);
      }
    });
  }, 500);
};

document.addEventListener(
  "hideTweetsFromUser",
  (e) => {
    e.preventDefault();
    e.stopPropagation();
    debugLog(`Hide event triggered for user: ${e.detail.username}`);
    hideTweetsFromUser(e.detail.username);
  },
  { once: false }
);

document.addEventListener("showTweetsFromUser", (e) => {
  e.preventDefault();
  e.stopPropagation();
  debugLog(`Show event triggered for user: ${e.detail.username}`);
  showTweetsFromUser(e.detail.username);
});

export const processTwitterFeed = async () => {
  try {
    processedTweets.clear();

    const isEnabled = await chromeStorageGet("isEnabled", true);
    if (!isEnabled) return;

    debugLog("Starting Twitter feed processing");

    const tweets = getTweetsFromElement(document);
    if (tweets.length > 0) {
      for (const tweet of tweets) {
        await processTweet(tweet);
      }
      setupObserver();
    } else {
      setTimeout(() => processTwitterFeed(), 2000);
    }

    const showCards = await chromeStorageGet("showCards", true);
    const hiddenCards = document.querySelectorAll(TwitterSelectors.hiddenCard);
    hiddenCards.forEach((card) => {
      card.style.display = showCards ? "block" : "none";
    });
  } catch (error) {
    debugLog(`Error processing Twitter feed: ${error.message}`);
  }
};

export const cleanupProcessor = () => {
  processedTweets.clear();
  if (tweetObserver) {
    tweetObserver.disconnect();
    tweetObserver = null;
  }
};
