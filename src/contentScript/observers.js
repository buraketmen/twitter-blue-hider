import { TwitterSelectors } from "./constants";
import { debugLog } from "./utils";
import { processTwitterFeed } from "./processor";
import { checkExtensionContext } from "./state";

export const observeTwitterFeed = () => {
  try {
    checkExtensionContext();
    debugLog("Setting up Twitter feed observer...");

    let isProcessing = false;
    let lastProcessTime = Date.now();
    const PROCESS_THROTTLE = 100;

    const observer = new MutationObserver((mutations) => {
      try {
        checkExtensionContext();
        if (isProcessing) return;

        const now = Date.now();
        if (now - lastProcessTime < PROCESS_THROTTLE) return;

        const hasNewTweets = mutations.some((mutation) =>
          Array.from(mutation.addedNodes).some(
            (node) =>
              node instanceof HTMLElement &&
              (node.matches?.(TwitterSelectors.tweet) ||
                node.querySelector?.(TwitterSelectors.tweet))
          )
        );

        if (hasNewTweets) {
          isProcessing = true;
          lastProcessTime = now;

          processTwitterFeed().finally(() => {
            isProcessing = false;
          });
        }
      } catch (error) {
        debugLog(`Observer error: ${error.message}`);
        if (error.message.includes("Extension context invalidated")) {
          observer.disconnect();
        }
      }
    });

    const feed = document.querySelector(TwitterSelectors.feed);
    if (feed) {
      observer.observe(feed, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });
      debugLog("Twitter feed observer started");
    } else {
      debugLog("Twitter feed not found");
    }

    return observer;
  } catch (error) {
    debugLog(`Error setting up observer: ${error.message}`);
    if (error.message.includes("Extension context invalidated")) {
      throw error;
    }
    return null;
  }
};
