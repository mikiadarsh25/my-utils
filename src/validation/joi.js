/**
 * Joi Validation Module
 * Schema-based validation using Joi
 */

const Joi = require('joi');
const { ValidationError } = require('../error');

/**
 * Validate data against Joi schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Joi schema
 * @param {Object} options - Validation options
 * @returns {Object} Validated data
 * @throws {ValidationError}
 */
function validate(data, schema, options = {}) {
    const defaultOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options
    };

    const { error, value } = schema.validate(data, defaultOptions);

    if (error) {
        const details = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
        }));

        throw new ValidationError('Validation failed', details);
    }

    return value;
}

/**
 * Create validation middleware for Lambda router
 * @param {Object} schema - Joi schema
 * @param {string} source - Source to validate ('body', 'query', 'params', 'headers')
 * @returns {Function} Middleware function
 */
function validateMiddleware(schema, source = 'body') {
    return async (req, res, next) => {
        try {
            req[source] = validate(req[source], schema);
            await next();
        } catch (error) {
            throw error;
        }
    };
}

/**
 * Validate request body
 * @param {Object} schema - Joi schema
 * @returns {Function} Middleware function
 */
function validateBody(schema) {
    return validateMiddleware(schema, 'body');
}

/**
 * Validate query parameters
 * @param {Object} schema - Joi schema
 * @returns {Function} Middleware function
 */
function validateQuery(schema) {
    return validateMiddleware(schema, 'queryStringParameters');
}

/**
 * Validate path parameters
 * @param {Object} schema - Joi schema
 * @returns {Function} Middleware function
 */
function validateParams(schema) {
    return validateMiddleware(schema, 'params');
}

/**
 * Validate headers
 * @param {Object} schema - Joi schema
 * @returns {Function} Middleware function
 */
function validateHeaders(schema) {
    return validateMiddleware(schema, 'headers');
}

/**
 * Common Joi schemas
 */
const commonSchemas = {
    // Email schema
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),

    // Password schema (min 8 chars, uppercase, lowercase, number, special char)
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
            'any.required': 'Password is required'
        }),

    // UUID schema
    uuid: Joi.string().uuid().required().messages({
        'string.uuid': 'Please provide a valid UUID',
        'any.required': 'ID is required'
    }),

    // Phone schema (international format)
    phone: Joi.string()
        .pattern(/^\+?[\d\s\-()]{10,}$/)
        .required()
        .messages({
            'string.pattern.base': 'Please provide a valid phone number',
            'any.required': 'Phone number is required'
        }),

    // URL schema
    url: Joi.string().uri().required().messages({
        'string.uri': 'Please provide a valid URL',
        'any.required': 'URL is required'
    }),

    // Pagination schemas
    pagination: {
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        offset: Joi.number().integer().min(0).default(0)
    },

    // Date schemas
    dateISO: Joi.date().iso().required().messages({
        'date.format': 'Date must be in ISO 8601 format',
        'any.required': 'Date is required'
    }),

    // Common string validations
    name: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
    }),

    // Status enum
    status: (values) => Joi.string().valid(...values).required().messages({
        'any.only': `Status must be one of: ${values.join(', ')}`,
        'any.required': 'Status is required'
    })
};

/**
 * Schema builders for common use cases
 */
const schemaBuilders = {
    /**
     * Create user registration schema
     */
    userRegistration: () => Joi.object({
        email: commonSchemas.email,
        password: commonSchemas.password,
        firstName: Joi.string().min(2).max(50).required(),
        lastName: Joi.string().min(2).max(50).required(),
        phone: commonSchemas.phone.optional(),
        dateOfBirth: Joi.date().max('now').optional()
    }),

    /**
     * Create user login schema
     */
    userLogin: () => Joi.object({
        email: commonSchemas.email,
        password: Joi.string().required()
    }),

    /**
     * Create ID param schema
     */
    idParam: () => Joi.object({
        id: commonSchemas.uuid
    }),

    /**
     * Create pagination query schema
     */
    paginationQuery: () => Joi.object({
        page: commonSchemas.pagination.page,
        limit: commonSchemas.pagination.limit,
        sortBy: Joi.string().optional(),
        sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
        search: Joi.string().optional()
    }),

    /**
     * Create update schema (makes all fields optional)
     */
    makeOptional: (schema) => {
        const keys = schema.describe().keys;
        const optionalKeys = {};

        for (const [key, value] of Object.entries(keys)) {
            optionalKeys[key] = Joi.optional();
        }

        return Joi.object(optionalKeys);
    }
};

/**
 * Custom validators
 */
const customValidators = {
    /**
     * Password confirmation validator
     */
    passwordConfirmation: () => Joi.object({
        password: commonSchemas.password,
        confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
            'any.only': 'Passwords must match'
        })
    }),

    /**
     * Date range validator
     */
    dateRange: () => Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required().messages({
            'date.min': 'End date must be after start date'
        })
    }),

    /**
     * File upload validator
     */
    fileUpload: (options = {}) => {
        const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
        const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'application/pdf'];

        return Joi.object({
            filename: Joi.string().required(),
            contentType: Joi.string().valid(...allowedTypes).required().messages({
                'any.only': `File type must be one of: ${allowedTypes.join(', ')}`
            }),
            size: Joi.number().max(maxSize).required().messages({
                'number.max': `File size cannot exceed ${maxSize / 1024 / 1024}MB`
            }),
            data: Joi.string().base64().required()
        });
    }
};

module.exports = {
    Joi,
    validate,
    validateMiddleware,
    validateBody,
    validateQuery,
    validateParams,
    validateHeaders,
    commonSchemas,
    schemaBuilders,
    customValidators
};
