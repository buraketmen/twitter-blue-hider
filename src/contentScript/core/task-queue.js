class TaskQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.abortController = new AbortController();
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await Promise.race([
        task(),
        new Promise((_, reject) => {
          this.abortController.signal.addEventListener("abort", () =>
            reject(new Error("Task aborted"))
          );
        }),
      ]);
      resolve(result);
    } catch (error) {
      if (error.message !== "Task aborted") {
        console.error("Task queue error:", error);
      }
      reject(error);
    }

    this.isProcessing = false;
    setTimeout(() => this.process(), 16); // One frame delay
  }

  clear() {
    this.abortController.abort();
    this.queue = [];
    this.isProcessing = false;
    this.abortController = new AbortController();
  }
}

export const tweetQueue = new TaskQueue();
