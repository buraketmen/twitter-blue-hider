import { TwitterSelectors } from "./constants";
import { debugLog } from "./utils";
import { processTwitterFeed } from "./core/processor";
import { cleanup } from "./core/state";

const processFeed = async () => {
  try {
    await processTwitterFeed();
  } catch (error) {
    debugLog(`Error initializing content script: ${error.message}`);
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
};

const initialize = () => {
  const feed = document.querySelector(TwitterSelectors.feed);
  if (feed) {
    processFeed();
  } else {
    setTimeout(initialize, 100);
  }
};

initialize();
