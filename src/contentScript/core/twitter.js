import { TwitterSelectors, TwitterUsername } from "../constants";
import { StorageManager } from "./managers";
import { chromeStorageGet } from "../utils";

export const addTooltip = (element, text) => {
  if (element._tooltipAdded) return;

  let tooltip = null;

  const createTooltip = () => {
    if (tooltip) {
      tooltip.remove();
    }

    tooltip = document.createElement("div");
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 13px;
      pointer-events: none;
      z-index: 1000;
      max-width: 250px;
      word-wrap: break-word;
      white-space: normal;
      line-height: 1.4;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    return tooltip;
  };

  const updateTooltipPosition = (e) => {
    if (!tooltip) return;

    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    let left = rect.left + (rect.width - tooltipWidth) / 2;
    let top = rect.top - tooltipHeight - 10 + window.scrollY;

    if (left < 10) {
      left = 10;
    } else if (left + tooltipWidth > windowWidth - 10) {
      left = windowWidth - tooltipWidth - 10;
    }

    if (top < 10) {
      top = rect.bottom + 10 + window.scrollY;
    } else if (top + tooltipHeight > windowHeight + window.scrollY - 10) {
      top = rect.bottom + 10 + window.scrollY;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  const showTooltip = (e) => {
    createTooltip();
    updateTooltipPosition(e);
  };

  const hideTooltip = () => {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  };

  element.addEventListener("mouseenter", showTooltip);
  element.addEventListener("mousemove", updateTooltipPosition);
  element.addEventListener("mouseleave", hideTooltip);

  element.addEventListener("click", hideTooltip);

  element._tooltipAdded = true;

  return element;
};

export const createHideButton = (tweet) => {
  const hideButton = document.createElement("div");
  hideButton.className = TwitterSelectors.hideButtonClass;
  hideButton.setAttribute("role", "button");
  hideButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    margin-right: 16px;
    padding: 0px;
    color: #1DA1F2;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 10;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  const textSpan = document.createElement("span");
  textSpan.textContent = "Hide";
  textSpan.style.cssText = `
    text-decoration: none;
    transition: text-decoration 0.1s ease;
    line-height: 1;
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
      tweet.dispatchEvent(
        new CustomEvent("hideTweetsFromUser", {
          bubbles: true,
          detail: { username },
        })
      );
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

  addTooltip(
    button,
    "Show this tweet and add user to whitelist. It will be available for new tweets."
  );

  button.addEventListener("click", async () => {
    try {
      const username = TwitterUsername.getFromTweet(tweet);

      if (username) {
        await StorageManager.addUser(username);

        tweet.dispatchEvent(
          new CustomEvent("showTweetsFromUser", {
            bubbles: true,
            detail: { username },
          })
        );

        const placeholder = document.createElement("div");
        placeholder.style.height = "72px";
        placeholder.style.transition = "all 0.1s ease";
        tweet.parentNode.insertBefore(placeholder, tweet);

        tweet.style.position = "absolute";
        tweet.style.top = "0";
        tweet.style.left = "0";
        tweet.style.width = "100%";
        tweet.style.zIndex = "1";
        tweet.style.opacity = "0";
        tweet.style.display = "block";

        const finalHeight = tweet.offsetHeight;

        tweet.style.transition = "all 0.1s ease";
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
      tweet.style.display = "block";
      card.remove();
    }
  });

  return card;
};

export const addHideButtonToVisibleTweet = (tweet, retryCount = 0) => {
  if (tweet.querySelector(`.${TwitterSelectors.hideButtonClass}`)) {
    return;
  }

  const MAX_RETRIES = 3;

  if (!tweet.isConnected || tweet.style.display === "none") {
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        addHideButtonToVisibleTweet(tweet, retryCount + 1);
      }, 500);
    }
    return;
  }

  let placementElement = null;
  for (const selector of TwitterSelectors.moreButton) {
    placementElement = tweet.querySelector(selector);
    if (placementElement?.parentElement) {
      break;
    }
  }

  if (!placementElement?.parentElement) {
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        addHideButtonToVisibleTweet(tweet, retryCount + 1);
      }, 500);
    }
    return;
  }

  const hideButton = createHideButton(tweet);
  const buttonContainer = placementElement.parentElement;

  buttonContainer.style.display = "flex";
  buttonContainer.style.alignItems = "center";
  buttonContainer.insertBefore(hideButton, placementElement);
};

export const showAllTweetsFromUser = async (username) => {
  try {
    const hiddenCards = document.querySelectorAll(TwitterSelectors.hiddenCard);

    for (const card of hiddenCards) {
      const cardUsernameElement = card.querySelector(
        TwitterSelectors.cardUsername
      );
      const cardUsername = TwitterUsername.extractClean(
        cardUsernameElement?.textContent
      );

      if (cardUsername === username) {
        const tweet = card.nextElementSibling;
        if (!tweet) continue;
        for (const selector of TwitterSelectors.tweet) {
          if (tweet.matches(selector)) {
            addHideButtonToVisibleTweet(tweet);
            card.remove();
            tweet.style.display = "block";
            break;
          }
        }
      }
    }
  } catch (error) {
    if (error.message.includes("Extension context invalidated")) {
      cleanup();
    }
  }
};
