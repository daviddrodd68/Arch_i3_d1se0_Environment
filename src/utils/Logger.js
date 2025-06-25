import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logFile = process.env.LOG_FILE;
    this.enableColors = process.stdout.isTTY;
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    this.colors = {
      error: chalk.red,
      warn: chalk.yellow,
      info: chalk.blue,
      debug: chalk.gray
    };

    this.setupLogFile();
  }

  async setupLogFile() {
    if (this.logFile) {
      try {
        await fs.ensureDir(path.dirname(this.logFile));
      } catch (error) {
        console.error('Failed to create log directory:', error);
      }
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const contextStr = `[${this.context}]`;
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formattedMessage = `${timestamp} ${levelStr} ${contextStr} ${message}`;
    
    if (args.length > 0) {
      const argsStr = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      formattedMessage += ` ${argsStr}`;
    }

    return formattedMessage;
  }

  formatConsoleMessage(level, message, ...args) {
    const timestamp = chalk.gray(new Date().toLocaleTimeString());
    const contextStr = chalk.cyan(`[${this.context}]`);
    const levelStr = this.colors[level](level.toUpperCase().padEnd(5));
    
    let formattedMessage = `${timestamp} ${levelStr} ${contextStr} ${message}`;
    
    if (args.length > 0) {
      const argsStr = args.map(arg => {
        if (typeof arg === 'object') {
          return chalk.gray(JSON.stringify(arg, null, 2));
        }
        return String(arg);
      }).join(' ');
      formattedMessage += ` ${argsStr}`;
    }

    return formattedMessage;
  }

  async writeToFile(message) {
    if (!this.logFile) return;

    try {
      await fs.appendFile(this.logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, ...args) {
    if (!this.shouldLog(level)) return;

    const fileMessage = this.formatMessage(level, message, ...args);
    const consoleMessage = this.enableColors ? 
      this.formatConsoleMessage(level, message, ...args) : 
      fileMessage;

    // Write to console
    console.log(consoleMessage);

    // Write to file
    this.writeToFile(fileMessage);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  // Convenience methods for common patterns
  success(message, ...args) {
    const successMessage = this.enableColors ? chalk.green(message) : message;
    this.info(successMessage, ...args);
  }

  failure(message, ...args) {
    const failureMessage = this.enableColors ? chalk.red(message) : message;
    this.error(failureMessage, ...args);
  }

  progress(message, ...args) {
    const progressMessage = this.enableColors ? chalk.blue(message) : message;
    this.info(progressMessage, ...args);
  }

  // Performance timing
  time(label) {
    this.timers = this.timers || new Map();
    this.timers.set(label, Date.now());
    this.debug(`Timer started: ${label}`);
  }

  timeEnd(label) {
    if (!this.timers || !this.timers.has(label)) {
      this.warn(`Timer not found: ${label}`);
      return;
    }

    const startTime = this.timers.get(label);
    const duration = Date.now() - startTime;
    this.timers.delete(label);
    
    this.info(`Timer ${label}: ${duration}ms`);
    return duration;
  }

  // Group logging
  group(label) {
    this.info(`┌─ ${label}`);
    this.groupDepth = (this.groupDepth || 0) + 1;
  }

  groupEnd() {
    this.groupDepth = Math.max(0, (this.groupDepth || 0) - 1);
    this.info('└─');
  }

  // Table logging for structured data
  table(data, columns) {
    if (!Array.isArray(data) || data.length === 0) {
      this.info('No data to display');
      return;
    }

    const headers = columns || Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(header => String(item[header] || ''))
    );

    // Calculate column widths
    const widths = headers.map((header, index) => {
      const headerWidth = header.length;
      const dataWidth = Math.max(...rows.map(row => row[index].length));
      return Math.max(headerWidth, dataWidth);
    });

    // Format table
    const separator = '├─' + widths.map(w => '─'.repeat(w + 2)).join('─┼─') + '─┤';
    const headerRow = '│ ' + headers.map((header, index) => 
      header.padEnd(widths[index])
    ).join(' │ ') + ' │';

    this.info('┌─' + widths.map(w => '─'.repeat(w + 2)).join('─┬─') + '─┐');
    this.info(headerRow);
    this.info(separator);

    rows.forEach(row => {
      const dataRow = '│ ' + row.map((cell, index) => 
        cell.padEnd(widths[index])
      ).join(' │ ') + ' │';
      this.info(dataRow);
    });

    this.info('└─' + widths.map(w => '─'.repeat(w + 2)).join('─┴─') + '─┘');
  }

  // JSON logging with pretty formatting
  json(data, label) {
    const jsonStr = JSON.stringify(data, null, 2);
    if (label) {
      this.info(`${label}:`);
    }
    this.info(jsonStr);
  }

  // Progress bar logging
  progressBar(current, total, label = 'Progress') {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((barLength * current) / total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    const progressMessage = `${label}: [${bar}] ${percentage}% (${current}/${total})`;
    
    if (this.enableColors) {
      const coloredBar = chalk.green('█'.repeat(filledLength)) + 
                        chalk.gray('░'.repeat(barLength - filledLength));
      const coloredMessage = `${chalk.cyan(label)}: [${coloredBar}] ${chalk.yellow(percentage + '%')} (${current}/${total})`;
      process.stdout.write('\r' + coloredMessage);
    } else {
      process.stdout.write('\r' + progressMessage);
    }

    if (current === total) {
      process.stdout.write('\n');
    }
  }

  // Create child logger with extended context
  child(childContext) {
    return new Logger(`${this.context}:${childContext}`);
  }

  // Set log level dynamically
  setLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.logLevel = level;
      this.debug(`Log level set to: ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  // Get current configuration
  getConfig() {
    return {
      context: this.context,
      logLevel: this.logLevel,
      logFile: this.logFile,
      enableColors: this.enableColors
    };
  }
}
