export const TwitterSelectors = {
  feed: 'main[role="main"]',
  tweet: ["article", '[data-testid="tweet"]'],
  cardUsername: 'span[style*="opacity: 0.5"]',
  userName: '[data-testid="User-Name"]',
  verifiedBadge: [
    '[data-testid="icon-verified"]',
    '[aria-label="Verified account"]',
    '[data-testid="User-Name"] [aria-label="Verified account"]',
    '[data-testid="User-Name"] [data-testid="icon-verified"]',
    'path[d^="M20.396 11c*"]',
  ],
  moreButton: [
    'button[aria-label="More"]',
    'button[data-testid="caret"]',
    'button[aria-label="More options"]',
    'div[data-testid="UserActions"]',
  ],
  tweetText: '[data-testid="tweetText"]',
  hiddenCardClass: "hidden-verified-post",
  hideButtonClass: "tweet-hide-button",
};

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
