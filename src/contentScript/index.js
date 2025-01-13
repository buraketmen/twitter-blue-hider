import { debugLog } from "./utils";
import { processTwitterFeed } from "./processor";
import { observeTwitterFeed } from "./observers";
import { SCROLL_THRESHOLD } from "./constants";
import { cleanup, checkExtensionContext } from "./state";

let lastScrollY = window.scrollY;
let scrollTimeout = null;
let isProcessing = false;
const SCROLL_PROCESS_DELAY = 100;

export const initScrollHandler = () => {
  window._twitterBlueHiderScrollHandler = () => {
    try {
      if (!checkExtensionContext()) return;
      if (isProcessing) return;

      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        const currentScrollY = window.scrollY;
        const scrollDiff = Math.abs(currentScrollY - lastScrollY);

        if (scrollDiff >= SCROLL_THRESHOLD) {
          isProcessing = true;
          lastScrollY = currentScrollY;

          processTwitterFeed()
            .catch((error) => {
              debugLog(`Error processing feed: ${error.message}`);
            })
            .finally(() => {
              isProcessing = false;
              scrollTimeout = null;
            });
        } else {
          scrollTimeout = null;
        }
      }, SCROLL_PROCESS_DELAY);
    } catch (error) {
      if (error.message.includes("Extension context invalidated")) {
        cleanup();
      }
    }
  };

  window.addEventListener("scroll", window._twitterBlueHiderScrollHandler, {
    passive: true,
  });
};

window._twitterBlueHiderMessageHandler = (message, sender, sendResponse) => {
  try {
    if (!checkExtensionContext()) return;
    if (message.type === "REFRESH_FEED") {
      processTwitterFeed();
    }
  } catch (error) {
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
};

chrome.runtime.onMessage.addListener(window._twitterBlueHiderMessageHandler);

const init = async () => {
  try {
    checkExtensionContext();
    debugLog("Initializing extension...");

    const result = await chrome.storage.sync.get(["isEnabled"]);
    const isEnabled = result.isEnabled ?? true;

    if (isEnabled) {
      initScrollHandler();

      await processTwitterFeed();
      window._twitterBlueHiderObserver = observeTwitterFeed();
    }
  } catch (error) {
    debugLog(`Initialization error: ${error.message}`);
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
};

init();
