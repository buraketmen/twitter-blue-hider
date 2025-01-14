export const TwitterSelectors = {
  tweet: 'article[role="article"]',
  userName: '[data-testid="User-Name"]',
  verifiedBadge: 'svg[aria-label="Verified account"]',
  moreButton: '[data-testid="caret"]',
  tweetGroup: 'div[role="group"]',
  tweetText: '[data-testid="tweetText"]',
  hiddenCard: ".hidden-verified-post",
  feed: 'main[role="main"]',
  processedTweetTag: "data-processed",
};

export const SCROLL_THRESHOLD = 100;
export const SCROLL_PROCESS_DELAY = 100;
