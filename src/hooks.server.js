import { supabase } from '$lib/supabase.js';
import { startLinkCheckerScheduler, stopLinkCheckerScheduler } from '$lib/scheduler.js';

let schedulerStarted = false;

/**
 * Initialize the link checker scheduler on server startup
 */
function initializeScheduler() {
  if (schedulerStarted) {
    console.log('Link checker scheduler already started');
    return;
  }

  try {
    console.log('Starting link checker scheduler...');
    startLinkCheckerScheduler(supabase);
    schedulerStarted = true;
    console.log('Link checker scheduler started successfully');
  } catch (error) {
    console.error('Failed to start link checker scheduler:', error);
  }
}

/**
 * Handle server startup
 */
export async function handle({ event, resolve }) {
  // Initialize scheduler on first request (server startup)
  if (!schedulerStarted) {
    initializeScheduler();
  }

  const response = await resolve(event);
  return response;
}

/**
 * Handle graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  stopLinkCheckerScheduler();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  stopLinkCheckerScheduler();
  process.exit(0);
});