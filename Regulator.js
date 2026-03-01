import chalk from 'chalk';

// Inalis ang ': () => void' dahil JS ito, hindi TS
export const startPulse = () => {
  const interval = setInterval(() => {
    const memory = process.memoryUsage();
    console.log(chalk.blue(`[PULSE] RSS: ${Math.round(memory.rss / 1024 / 1024)}MB`));
    
    // Manual Garbage Collection kung enabled
    if (global.gc) global.gc();
  }, 15000);

  return () => clearInterval(interval);
};

export const handleShutdown = (stopTelemetry) => {
  console.log(chalk.yellow('\n[REGULATOR] Securely closing valves...'));
  
  if (typeof stopTelemetry === 'function') {
    stopTelemetry();
  }
  
  process.exit(0);
};