/**
 * AWS Utilities Module
 * Helpers for AWS services
 */

const lambda = require('./lambda');
const dynamodb = require('./dynamodb');
const s3 = require('./s3');
const ses = require('./ses');

module.exports = {
    lambda,
    dynamodb,
    s3,
    ses
};
