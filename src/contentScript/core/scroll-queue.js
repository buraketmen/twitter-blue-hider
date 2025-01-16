import debounce from "lodash/debounce";

class ScrollManager {
  constructor() {
    this.isProcessing = false;
    this.queue = [];
  }

  getElementPosition = (element) => {
    const elementTop = element.getBoundingClientRect().top;
    return elementTop > 0 ? "bottom" : "top";
  };

  calculateDifference(tweetHeight, newElementHeight, tweetElementPosition) {
    if (tweetHeight === newElementHeight || tweetElementPosition == "bottom")
      return 0;
    return -Math.abs(tweetHeight - newElementHeight);
  }

  async adjustScroll({ tweetHeight, newElementHeight, tweetElementPosition }) {
    const difference = this.calculateDifference(
      tweetHeight,
      newElementHeight,
      tweetElementPosition
    );

    if (difference === 0) return;
    return new Promise((resolve) => {
      this.queue.push({
        position: window.scrollY + difference,
        callback: resolve,
      });
      this.processQueue();
    });
  }

  scrollToPosition = debounce(
    (position) => {
      console.log("runned", new Date().toISOString());
      if (window.scrollY <= position) return;
      window.scrollTo({
        top: Math.max(0, position),
        behavior: "auto",
      });
    },
    1500,
    { maxWait: 3000, leading: false }
  );

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { position, callback } = this.queue.shift();

    this.scrollToPosition(position);

    await new Promise((resolve) => setTimeout(resolve, 50));
    callback?.();

    this.isProcessing = false;
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
}

export const scrollManager = new ScrollManager();
