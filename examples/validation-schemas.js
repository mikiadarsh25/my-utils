/**
 * Common Validation Schemas
 * Reusable Joi schemas for typical use cases
 */

const { Joi } = require('../src/validation/joi');

// ========================================
// User Schemas
// ========================================

const userSchemas = {
    registration: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
            .required()
            .messages({
                'string.min': 'Password must be at least 8 characters',
                'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
                'any.required': 'Password is required'
            }),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
            'any.only': 'Passwords must match'
        }),
        firstName: Joi.string().min(2).max(50).required(),
        lastName: Joi.string().min(2).max(50).required(),
        phone: Joi.string().pattern(/^\+?[\d\s\-()]{10,}$/).optional(),
        dateOfBirth: Joi.date().max('now').optional(),
        acceptTerms: Joi.boolean().valid(true).required().messages({
            'any.only': 'You must accept the terms and conditions'
        })
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        rememberMe: Joi.boolean().default(false)
    }),

    profile: Joi.object({
        firstName: Joi.string().min(2).max(50).optional(),
        lastName: Joi.string().min(2).max(50).optional(),
        phone: Joi.string().pattern(/^\+?[\d\s\-()]{10,}$/).optional(),
        bio: Joi.string().max(500).optional(),
        website: Joi.string().uri().optional(),
        location: Joi.string().max(100).optional(),
        avatar: Joi.string().uri().optional()
    }).min(1),

    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
            .required()
            .invalid(Joi.ref('currentPassword'))
            .messages({
                'any.invalid': 'New password must be different from current password'
            }),
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    }),

    resetPassword: Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
            .required(),
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    })
};

// ========================================
// E-commerce Schemas
// ========================================

const ecommerceSchemas = {
    product: Joi.object({
        name: Joi.string().min(3).max(200).required(),
        description: Joi.string().min(10).max(2000).required(),
        price: Joi.number().positive().precision(2).required(),
        comparePrice: Joi.number().positive().precision(2).greater(Joi.ref('price')).optional(),
        sku: Joi.string().alphanum().required(),
        category: Joi.string().required(),
        subcategory: Joi.string().optional(),
        brand: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        images: Joi.array().items(Joi.string().uri()).min(1).required(),
        stock: Joi.number().integer().min(0).required(),
        weight: Joi.number().positive().optional(),
        dimensions: Joi.object({
            length: Joi.number().positive(),
            width: Joi.number().positive(),
            height: Joi.number().positive()
        }).optional(),
        isActive: Joi.boolean().default(true)
    }),

    order: Joi.object({
        customerId: Joi.string().uuid().required(),
        items: Joi.array().items(
            Joi.object({
                productId: Joi.string().uuid().required(),
                quantity: Joi.number().integer().min(1).required(),
                price: Joi.number().positive().required()
            })
        ).min(1).required(),
        shippingAddress: Joi.object({
            fullName: Joi.string().required(),
            street: Joi.string().required(),
            apartment: Joi.string().optional(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
            country: Joi.string().length(2).uppercase().required(),
            phone: Joi.string().pattern(/^\+?[\d\s\-()]{10,}$/).required()
        }).required(),
        billingAddress: Joi.object({
            sameAsShipping: Joi.boolean().required(),
            street: Joi.when('sameAsShipping', {
                is: false,
                then: Joi.string().required(),
                otherwise: Joi.forbidden()
            }),
            city: Joi.when('sameAsShipping', {
                is: false,
                then: Joi.string().required(),
                otherwise: Joi.forbidden()
            })
            // Add more billing fields as needed
        }).optional(),
        paymentMethod: Joi.string().valid('credit_card', 'paypal', 'bank_transfer', 'cod').required(),
        couponCode: Joi.string().optional(),
        notes: Joi.string().max(500).optional()
    }),

    cart: Joi.object({
        userId: Joi.string().uuid().required(),
        items: Joi.array().items(
            Joi.object({
                productId: Joi.string().uuid().required(),
                quantity: Joi.number().integer().min(1).max(99).required(),
                addedAt: Joi.date().default(Date.now)
            })
        )
    })
};

// ========================================
// Blog/CMS Schemas
// ========================================

const cmsSchemas = {
    post: Joi.object({
        title: Joi.string().min(5).max(200).required(),
        slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
        content: Joi.string().min(50).required(),
        excerpt: Joi.string().max(300).optional(),
        featuredImage: Joi.string().uri().optional(),
        category: Joi.string().required(),
        tags: Joi.array().items(Joi.string()).optional(),
        status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
        publishedAt: Joi.date().when('status', {
            is: 'published',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),
        seo: Joi.object({
            metaTitle: Joi.string().max(60).optional(),
            metaDescription: Joi.string().max(160).optional(),
            keywords: Joi.array().items(Joi.string()).optional()
        }).optional()
    }),

    comment: Joi.object({
        postId: Joi.string().uuid().required(),
        userId: Joi.string().uuid().optional(),
        author: Joi.string().min(2).max(50).required(),
        email: Joi.string().email().required(),
        content: Joi.string().min(5).max(1000).required(),
        parentCommentId: Joi.string().uuid().optional()
    })
};

// ========================================
// API Query Schemas
// ========================================

const querySchemas = {
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        offset: Joi.number().integer().min(0).default(0)
    }),

    sorting: Joi.object({
        sortBy: Joi.string().optional(),
        sortOrder: Joi.string().valid('asc', 'desc').default('asc')
    }),

    search: Joi.object({
        q: Joi.string().min(1).max(100).optional(),
        fields: Joi.array().items(Joi.string()).optional()
    }),

    dateRange: Joi.object({
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
    }),

    filter: Joi.object({
        status: Joi.string().optional(),
        category: Joi.string().optional(),
        minPrice: Joi.number().positive().optional(),
        maxPrice: Joi.number().positive().min(Joi.ref('minPrice')).optional(),
        tags: Joi.array().items(Joi.string()).optional()
    })
};

// ========================================
// File Upload Schemas
// ========================================

const fileSchemas = {
    image: Joi.object({
        filename: Joi.string().required(),
        contentType: Joi.string().valid('image/jpeg', 'image/png', 'image/gif', 'image/webp').required(),
        size: Joi.number().max(5 * 1024 * 1024).required().messages({
            'number.max': 'Image size cannot exceed 5MB'
        }),
        data: Joi.string().base64().required()
    }),

    document: Joi.object({
        filename: Joi.string().required(),
        contentType: Joi.string().valid('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').required(),
        size: Joi.number().max(10 * 1024 * 1024).required().messages({
            'number.max': 'Document size cannot exceed 10MB'
        }),
        data: Joi.string().base64().required()
    }),

    csv: Joi.object({
        filename: Joi.string().pattern(/\.csv$/).required(),
        contentType: Joi.string().valid('text/csv', 'application/csv').required(),
        size: Joi.number().max(20 * 1024 * 1024).required(),
        data: Joi.string().required()
    })
};

// ========================================
// Tenant/Settings Schemas
// ========================================

const tenantSchemas = {
    createTenant: Joi.object({
        name: Joi.string().min(3).max(100).required(),
        domain: Joi.string().hostname().required(),
        adminEmail: Joi.string().email().required(),
        plan: Joi.string().valid('free', 'basic', 'premium', 'enterprise').required(),
        settings: Joi.object({
            timezone: Joi.string().default('UTC'),
            language: Joi.string().length(2).default('en'),
            currency: Joi.string().length(3).uppercase().default('USD')
        }).optional()
    }),

    updateSettings: Joi.object({
        timezone: Joi.string().optional(),
        language: Joi.string().length(2).optional(),
        currency: Joi.string().length(3).uppercase().optional(),
        notifications: Joi.object({
            email: Joi.boolean(),
            sms: Joi.boolean(),
            push: Joi.boolean()
        }).optional(),
        privacy: Joi.object({
            profileVisible: Joi.boolean(),
            showEmail: Joi.boolean()
        }).optional()
    }).min(1)
};

// ========================================
// Export All Schemas
// ========================================

module.exports = {
    userSchemas,
    ecommerceSchemas,
    cmsSchemas,
    querySchemas,
    fileSchemas,
    tenantSchemas
};
