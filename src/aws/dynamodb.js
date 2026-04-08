/**
 * AWS DynamoDB Utilities
 * Helper functions for DynamoDB operations
 */

/**
 * Build DynamoDB update expression
 * @param {Object} updates - Object with fields to update
 * @returns {Object} - Contains UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues
 */
function buildUpdateExpression(updates) {
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    let index = 0;
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
            const attrName = `#attr${index}`;
            const attrValue = `:val${index}`;

            updateExpression.push(`${attrName} = ${attrValue}`);
            expressionAttributeNames[attrName] = key;
            expressionAttributeValues[attrValue] = value;

            index++;
        }
    }

    return {
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    };
}

/**
 * Build DynamoDB filter expression
 * @param {Object} filters - Object with filter conditions
 * @returns {Object}
 */
function buildFilterExpression(filters) {
    const filterExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    let index = 0;
    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
            const attrName = `#filter${index}`;
            const attrValue = `:filterVal${index}`;

            filterExpressions.push(`${attrName} = ${attrValue}`);
            expressionAttributeNames[attrName] = key;
            expressionAttributeValues[attrValue] = value;

            index++;
        }
    }

    return {
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    };
}

/**
 * Parse DynamoDB scan results
 * @param {Object} result - DynamoDB scan/query result
 * @returns {Object}
 */
function parseScanResults(result) {
    return {
        items: result.Items || [],
        count: result.Count || 0,
        scannedCount: result.ScannedCount || 0,
        lastEvaluatedKey: result.LastEvaluatedKey || null
    };
}

module.exports = {
    buildUpdateExpression,
    buildFilterExpression,
    parseScanResults
};
