export const TwitterSelectors = {
  tweet: 'article[role="article"]',
  userName: '[data-testid="User-Name"]',
  verifiedBadge: 'svg[aria-label="Verified account"]',
  moreButton: '[data-testid="caret"]',
  tweetLink: 'a[href*="/status/"]',
  tweetContainer: '[data-testid="cellInnerDiv"]',
  tweetGroup: 'div[role="group"]',
  timestamp: "time",
  hiddenCard: ".hidden-verified-post",
};

export const SCROLL_THRESHOLD = 100;
export const SCROLL_DEBOUNCE = 150;
