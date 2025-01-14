import { TwitterSelectors } from "../constants";
import { StorageManager } from "./managers";
import { debugLog, chromeStorageGet } from "../utils";

export const TwitterUsername = {
  extractClean: (fullUsername) => {
    if (!fullUsername) return null;
    const username = fullUsername.split("@")[1]?.split("·")[0]?.trim();
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

export const addTooltip = (element, text) => {
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

export const createHideButton = (tweet) => {
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
      await StorageManager.removeUser(username);
      const newCard = await createHiddenPostCard(tweet);
      tweet.parentNode.insertBefore(newCard, tweet);
      tweet.style.display = "none";
    }
  });

  addTooltip(
    hideButton,
    "Hide this user's tweets and remove them from whitelist"
  );

  return hideButton;
};

export const createHiddenPostCard = async (tweet) => {
  const selectedUsername =
    tweet.querySelector(TwitterSelectors.userName)?.textContent || "Unknown";
  const [name, rest] = selectedUsername.split("@");

  const showCards = await chromeStorageGet("showCards", true);
  const card = document.createElement("div");
  card.className = TwitterSelectors.hiddenCard.replace(".", "");
  card.style.cssText = `
    padding: 16px;
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: ${showCards ? "block" : "none"};
  `;

  card.innerHTML = `
    <div style="display: flex; gap: 8px;">
        <div style="display: flex; height: 40px; width: 40px;min-width: 40px;min-height: 40px; align-items: center; justify-content: center;">
            <div style="height:100%; width:100%; border-radius: 50%; background-color: gray;"></div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600;font-size: 15px;">${name}</span>
                <span style="font-weight: 100; opacity: 0.5;font-size: 15px;">@${rest}</span>
                <svg viewBox="0 0 24 24" width="16" height="16" style="margin-top: -2px;">
                    <path fill="#1DA1F2" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
                </svg>
            </div>
            <div style="display: flex; align-items: center; justify-content: center;">
                <button style="background-color: transparent; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #1DA1F2; height: 100%;display: flex; align-items: center;justify-content: center;">
                    <span style="text-decoration: none; transition: text-decoration 0.2s ease;line-height: 1.1;">Show</span>
                </button>
            </div>
        </div>
    </div>
  `;

  const button = card.querySelector("button");
  const buttonText = button.querySelector("span");

  button.addEventListener("mouseenter", () => {
    buttonText.style.textDecoration = "underline";
  });

  button.addEventListener("mouseleave", () => {
    buttonText.style.textDecoration = "none";
  });

  addTooltip(button, "Show this tweet and add user to whitelist");

  button.addEventListener("click", async () => {
    try {
      const username = TwitterUsername.getFromTweet(tweet);

      if (username) {
        await StorageManager.addUser(username);
        await showAllTweetsFromUser(username);
      }
    } catch (error) {
      debugLog(`Error showing post: ${error.message}`);
      tweet.style.display = "block";
      card.remove();
    }
  });

  return card;
};

export const addHideButtonToVisibleTweet = (tweet) => {
  if (!tweet.querySelector(".tweet-hide-button")) {
    const moreButton = tweet.querySelector(TwitterSelectors.moreButton);
    if (moreButton) {
      const hideButton = createHideButton(tweet);
      const tweetHeader =
        moreButton.closest(TwitterSelectors.tweetGroup) ||
        moreButton.parentElement;
      tweetHeader.style.position = "relative";
      tweetHeader.appendChild(hideButton);
    }
  }
};

export const showAllTweetsFromUser = async (username) => {
  try {
    const hiddenCards = document.querySelectorAll(TwitterSelectors.hiddenCard);

    for (const card of hiddenCards) {
      const cardUsernameElement = card.querySelector(
        'span[style*="opacity: 0.5"]'
      );
      const cardUsername = TwitterUsername.extractClean(
        cardUsernameElement?.textContent
      );

      if (cardUsername === username) {
        const tweet = card.nextElementSibling;
        if (tweet && tweet.matches(TwitterSelectors.tweet)) {
          if (!tweet.querySelector(".tweet-hide-button")) {
            const moreButton = tweet.querySelector(TwitterSelectors.moreButton);
            if (moreButton) {
              const hideButton = createHideButton(tweet);
              const tweetHeader =
                moreButton.closest(TwitterSelectors.tweetGroup) ||
                moreButton.parentElement;
              tweetHeader.style.position = "relative";
              tweetHeader.appendChild(hideButton);
            }
          }

          card.remove();
          tweet.style.display = "block";
        }
      }
    }
  } catch (error) {
    debugLog(`Error showing tweets from user: ${error.message}`);
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
};
