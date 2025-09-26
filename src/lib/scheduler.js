import { checkAllLinks } from './link-checker.js';

/**
 * Simple job scheduler for running periodic tasks
 */
export class JobScheduler {
  constructor() {
    this.jobs = new Map();
    this.running = false;
  }

  /**
   * Add a job to the scheduler
   * @param {string} name - Job name
   * @param {Function} task - Task function to execute
   * @param {number} intervalMs - Interval in milliseconds
   */
  addJob(name, task, intervalMs) {
    if (this.jobs.has(name)) {
      console.warn(`Job ${name} already exists, replacing it`);
      this.removeJob(name);
    }

    const job = {
      name,
      task,
      intervalMs,
      intervalId: null,
      lastRun: null,
      nextRun: null,
      running: false
    };

    this.jobs.set(name, job);
    console.log(`Added job: ${name} (interval: ${intervalMs}ms)`);
  }

  /**
   * Remove a job from the scheduler
   * @param {string} name - Job name
   */
  removeJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      if (job.intervalId) {
        clearInterval(job.intervalId);
      }
      this.jobs.delete(name);
      console.log(`Removed job: ${name}`);
    }
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.running) {
      console.warn('Scheduler is already running');
      return;
    }

    this.running = true;
    console.log('Starting job scheduler...');

    for (const [name, job] of this.jobs) {
      this.startJob(job);
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.running) {
      console.warn('Scheduler is not running');
      return;
    }

    this.running = false;
    console.log('Stopping job scheduler...');

    for (const [name, job] of this.jobs) {
      if (job.intervalId) {
        clearInterval(job.intervalId);
        job.intervalId = null;
      }
    }
  }

  /**
   * Start a specific job
   * @param {Object} job - Job object
   */
  startJob(job) {
    if (job.intervalId) {
      clearInterval(job.intervalId);
    }

    // Run immediately on start
    this.runJob(job);

    // Schedule recurring runs
    job.intervalId = setInterval(() => {
      this.runJob(job);
    }, job.intervalMs);

    job.nextRun = new Date(Date.now() + job.intervalMs);
    console.log(`Started job: ${job.name}, next run: ${job.nextRun.toISOString()}`);
  }

  /**
   * Run a specific job
   * @param {Object} job - Job object
   */
  async runJob(job) {
    if (job.running) {
      console.warn(`Job ${job.name} is already running, skipping this execution`);
      return;
    }

    job.running = true;
    job.lastRun = new Date();
    job.nextRun = new Date(Date.now() + job.intervalMs);

    console.log(`Running job: ${job.name} at ${job.lastRun.toISOString()}`);

    try {
      const result = await job.task();
      console.log(`Job ${job.name} completed successfully:`, result);
    } catch (error) {
      console.error(`Job ${job.name} failed:`, error);
    } finally {
      job.running = false;
    }
  }

  /**
   * Get job status
   * @param {string} name - Job name
   * @returns {Object|null} - Job status or null if not found
   */
  getJobStatus(name) {
    const job = this.jobs.get(name);
    if (!job) {
      return null;
    }

    return {
      name: job.name,
      intervalMs: job.intervalMs,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      running: job.running,
      active: !!job.intervalId
    };
  }

  /**
   * Get all job statuses
   * @returns {Array} - Array of job statuses
   */
  getAllJobStatuses() {
    return Array.from(this.jobs.keys()).map(name => this.getJobStatus(name));
  }
}

/**
 * Create and configure the link checker job scheduler
 * @param {Object} supabase - Supabase client
 * @returns {JobScheduler} - Configured scheduler
 */
export function createLinkCheckerScheduler(supabase) {
  const scheduler = new JobScheduler();

  // Add link checker job that runs every 24 hours (daily)
  scheduler.addJob(
    'link-checker',
    async () => {
      console.log('Starting scheduled daily link check...');
      const results = await checkAllLinks(supabase);
      console.log('Scheduled daily link check completed:', results);
      return results;
    },
    24 * 60 * 60 * 1000 // 24 hours in milliseconds
  );

  return scheduler;
}

// Global scheduler instance
let globalScheduler = null;

/**
 * Get or create the global scheduler instance
 * @param {Object} supabase - Supabase client
 * @returns {JobScheduler} - Global scheduler instance
 */
export function getGlobalScheduler(supabase) {
  if (!globalScheduler) {
    globalScheduler = createLinkCheckerScheduler(supabase);
  }
  return globalScheduler;
}

/**
 * Start the global link checker scheduler
 * @param {Object} supabase - Supabase client
 */
export function startLinkCheckerScheduler(supabase) {
  const scheduler = getGlobalScheduler(supabase);
  scheduler.start();
  return scheduler;
}

/**
 * Stop the global link checker scheduler
 */
export function stopLinkCheckerScheduler() {
  if (globalScheduler) {
    globalScheduler.stop();
  }
}