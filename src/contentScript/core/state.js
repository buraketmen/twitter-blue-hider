import { debugLog, chromeStorageGet, getTweetsFromElement } from "../utils";
import { TwitterSelectors } from "../constants";
import { cleanupProcessor, processTwitterFeed } from "../core/processor";

export let isEnabled = true;

export const cleanup = () => {
  cleanupProcessor();
};

export const checkExtensionContext = () => {
  return !!chrome.runtime?.id;
};

export const handleExtensionStateChange = async () => {
  try {
    if (!checkExtensionContext()) return;
    const wasEnabled = isEnabled;
    const showCards = await chromeStorageGet("showCards", true);
    isEnabled = await chromeStorageGet("isEnabled", true);

    if (wasEnabled !== isEnabled) {
      debugLog(`Extension enabled state changed to: ${isEnabled}`);

      if (!isEnabled) {
        const hiddenTweets = getTweetsFromElement(
          document,
          '[style*="display: none"]'
        );

        hiddenTweets.forEach((tweet) => {
          tweet.style.display = "block";
        });

        const hiddenCards = document.querySelectorAll(
          `.${TwitterSelectors.hiddenCardClass}`
        );
        hiddenCards.forEach((card) => card.remove());
        cleanup();
      } else {
        await processTwitterFeed();
      }
    } else if (showCards !== undefined) {
      const hiddenCards = document.querySelectorAll(
        `.${TwitterSelectors.hiddenCardClass}`
      );
      hiddenCards.forEach((card) => {
        card.style.display = showCards ? "block" : "none";
      });
    }
  } catch (error) {
    debugLog(`Error handling extension state change: ${error.message}`);
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
};

chrome.storage.onChanged.addListener((changes) => {
  try {
    if (!checkExtensionContext()) return;
    if (changes.showCards) {
      handleExtensionStateChange();
    }
  } catch (error) {
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
});
