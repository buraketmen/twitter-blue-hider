import { TwitterSelectors, TwitterUsername } from "../constants";
import { StorageManager } from "./managers";
import { debugLog, chromeStorageGet } from "../utils";

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
    right: 54px;
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
      const showCards = await chromeStorageGet("showCards", true);

      const allTweets = document.querySelectorAll(TwitterSelectors.tweet);
      for (const t of allTweets) {
        const tweetUsername = TwitterUsername.getFromTweet(t);
        if (tweetUsername === username) {
          const newCard = await createHiddenPostCard(t);
          const cardHeight = showCards ? "72px" : "0px";

          const placeholder = document.createElement("div");
          const tweetHeight = t.offsetHeight;
          placeholder.style.height = tweetHeight + "px";
          placeholder.style.transition = "all 0.3s ease";
          t.parentNode.insertBefore(placeholder, t);

          const tweetRect = t.getBoundingClientRect();
          const parentRect = t.parentElement.getBoundingClientRect();
          t.style.position = "absolute";
          t.style.top = tweetRect.top - parentRect.top + "px";
          t.style.left = "0";
          t.style.width = "100%";
          t.style.zIndex = "1";

          t.style.transition = "all 0.3s ease";
          t.style.opacity = "1";
          placeholder.offsetHeight; // Force reflow

          t.style.opacity = "0";
          placeholder.style.height = cardHeight;

          setTimeout(() => {
            placeholder.remove();
            t.parentNode.insertBefore(newCard, t);
            t.style.display = "none";
            t.style.position = "";
            t.style.top = "";
            t.style.left = "";
            t.style.width = "";
            t.style.zIndex = "";
            t.style.transition = "";
            t.style.opacity = "";
          }, 300);
        }
      }
    }
  });

  addTooltip(
    hideButton,
    "Hide this user's tweets and remove them from whitelist. It will hide all tweets from this user."
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

  addTooltip(
    button,
    "Show this tweet and add user to whitelist. It will be available for new tweets."
  );

  button.addEventListener("click", async () => {
    try {
      const username = TwitterUsername.getFromTweet(tweet);

      if (username) {
        await StorageManager.addUser(username);

        const placeholder = document.createElement("div");
        placeholder.style.height = "72px";
        placeholder.style.transition = "all 0.3s ease";
        tweet.parentNode.insertBefore(placeholder, tweet);

        tweet.style.position = "absolute";
        tweet.style.top = "0";
        tweet.style.left = "0";
        tweet.style.width = "100%";
        tweet.style.zIndex = "1";
        tweet.style.opacity = "0";
        tweet.style.display = "block";

        const finalHeight = tweet.offsetHeight;

        tweet.style.transition = "all 0.3s ease";
        placeholder.offsetHeight; // Force reflow

        tweet.style.opacity = "1";
        placeholder.style.height = finalHeight + "px";

        setTimeout(() => {
          tweet.style.position = "";
          tweet.style.top = "";
          tweet.style.left = "";
          tweet.style.width = "";
          tweet.style.zIndex = "";
          tweet.style.transition = "";
          tweet.style.opacity = "";
          placeholder.remove();
          addHideButtonToVisibleTweet(tweet);
        }, 300);

        card.remove();
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
      const tweetHeader = moreButton.parentElement;
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
          addHideButtonToVisibleTweet(tweet);
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
