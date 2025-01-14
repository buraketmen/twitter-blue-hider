export const TwitterSelectors = {
  tweet: 'article[role="article"]',
  userName: '[data-testid="User-Name"]',
  verifiedBadge: 'svg[aria-label="Verified account"]',
  moreButton: '[aria-label="More"]',
  tweetText: '[data-testid="tweetText"]',
  hiddenCard: ".hidden-verified-post",
  feed: 'main[role="main"]',
  processedTweetTag: "data-processed",
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
