/**
 * adevUtils - Main Entry Point
 * Centralized utility modules for common development tasks
 */

const http = require('./src/http');
const aws = require('./src/aws');
const validation = require('./src/validation');
const logger = require('./src/logger');
const date = require('./src/date');
const string = require('./src/string');
const error = require('./src/error');
const response = require('./src/response');
const security = require('./src/security');
const router = require('./src/router');

// Express utilities (optional, requires express package)
let express;
try {
    express = require('./src/express');
} catch (err) {
    express = null;
}

module.exports = {
    http,
    aws,
    validation,
    logger,
    date,
    string,
    error,
    response,
    security,
    router,
    express
};
