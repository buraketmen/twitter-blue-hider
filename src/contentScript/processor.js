import { TwitterSelectors } from "./constants";
import { debugLog } from "./utils";
import {
  isEnabled,
  shownPosts,
  checkExtensionContext,
  WhitelistManager,
} from "./state";
import {
  createHiddenPostCard,
  addHideButtonToVisibleTweet,
  TwitterUsername,
} from "./twitter";

export const processTwitterFeed = async () => {
  try {
    checkExtensionContext();
    if (!isEnabled) return;

    const tweets = Array.from(
      document.querySelectorAll(TwitterSelectors.tweet)
    ).filter(
      (tweet) => !shownPosts.has(tweet) && !tweet.hasAttribute("data-processed")
    );

    for (const tweet of tweets) {
      tweet.setAttribute("data-processed", "true");
      shownPosts.add(tweet);

      const verifiedBadge = tweet.querySelector(TwitterSelectors.verifiedBadge);
      if (!verifiedBadge) continue;

      const username = TwitterUsername.getFromTweet(tweet);
      if (username && (await WhitelistManager.isUserWhitelisted(username))) {
        addHideButtonToVisibleTweet(tweet);
        continue;
      }

      const hiddenCard = await createHiddenPostCard(tweet);
      tweet.parentNode.insertBefore(hiddenCard, tweet);
      tweet.style.display = "none";
    }

    const { showCards } = await chrome.storage.sync.get({ showCards: true });
    const hiddenCards = document.querySelectorAll(TwitterSelectors.hiddenCard);
    hiddenCards.forEach((card) => {
      card.style.display = showCards ? "block" : "none";
    });
  } catch (error) {
    debugLog(`Error processing Twitter feed: ${error.message}`);
    if (error.message.includes("Extension context invalidated")) {
      throw error;
    }
  }
};
