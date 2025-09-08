const { version } = require('../package.json');

const service = process.env.SERVICE_NAME || 'canon-pirotecnicos-backend';
const environment = process.env.NODE_ENV || 'development';

function serializeError(err) {
  if (!err) return undefined;
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

function baseFields() {
  return {
    timestamp: new Date().toISOString(),
    service,
    environment,
    version,
  };
}

function write(level, message, meta = {}) {
  // Ensure single-line JSON for CloudWatch Logs
  const payload = Object.assign({}, baseFields(), { level, message }, meta);
  try {
    // Prefer stdout for info/warn and stderr for errors
    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
    } else {
      console.log(line);
    }
  } catch (e) {
    // Fallback minimal logging
    console.log(`[${level}] ${message}`);
  }
}

const logger = {
  info(message, meta) {
    write('info', message, meta);
  },
  warn(message, meta) {
    write('warn', message, meta);
  },
  error(message, meta) {
    if (meta && meta.error && typeof meta.error !== 'object') {
      // Normalize error field if needed
      meta.error = { message: String(meta.error) };
    }
    write('error', message, meta);
  },
  debug(message, meta) {
    if (process.env.LOG_LEVEL === 'debug') write('debug', message, meta);
  },
  event(eventName, meta) {
    write('info', 'event', Object.assign({ event: eventName }, meta));
  },
  child(context = {}) {
    return {
      info: (message, meta) => logger.info(message, Object.assign({}, context, meta)),
      warn: (message, meta) => logger.warn(message, Object.assign({}, context, meta)),
      error: (message, meta) => logger.error(message, Object.assign({}, context, meta)),
      debug: (message, meta) => logger.debug(message, Object.assign({}, context, meta)),
      event: (eventName, meta) => logger.event(eventName, Object.assign({}, context, meta)),
    };
  },
  serializeError,
};

module.exports = logger;

