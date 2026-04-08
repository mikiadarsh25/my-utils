/**
 * Lambda Router Module
 * Route handling and middleware system for AWS Lambda
 */

const { createResponse, parseEvent } = require('../aws/lambda');
const { createLogger } = require('../logger');
const { AppError } = require('../error');

class Router {
    constructor(options = {}) {
        this.routes = {};
        this.globalMiddlewares = [];
        this.errorHandler = options.errorHandler || this.defaultErrorHandler;
        this.logger = options.logger || createLogger({ service: 'router' });
        this.cors = options.cors !== false;
    }

    /**
     * Register global middleware
     * @param {Function} middleware - Middleware function
     */
    use(middleware) {
        this.globalMiddlewares.push(middleware);
        return this;
    }

    /**
     * Register a route
     * @param {string} method - HTTP method
     * @param {string} path - Route path
     * @param {Array|Function} handlers - Middleware/handler functions
     */
    route(method, path, ...handlers) {
        const key = `${method.toUpperCase()}:${path}`;
        this.routes[key] = handlers.flat();
        return this;
    }

    /**
     * Register GET route
     */
    get(path, ...handlers) {
        return this.route('GET', path, ...handlers);
    }

    /**
     * Register POST route
     */
    post(path, ...handlers) {
        return this.route('POST', path, ...handlers);
    }

    /**
     * Register PUT route
     */
    put(path, ...handlers) {
        return this.route('PUT', path, ...handlers);
    }

    /**
     * Register PATCH route
     */
    patch(path, ...handlers) {
        return this.route('PATCH', path, ...handlers);
    }

    /**
     * Register DELETE route
     */
    delete(path, ...handlers) {
        return this.route('DELETE', path, ...handlers);
    }

    /**
     * Register route for all methods
     */
    all(path, ...handlers) {
        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(method => {
            this.route(method, path, ...handlers);
        });
        return this;
    }

    /**
     * Match route from event
     * @private
     */
    matchRoute(event) {
        const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
        const path = event.path || event.requestContext?.http?.path || event.resource || '/';

        // Exact match
        const exactKey = `${method}:${path}`;
        if (this.routes[exactKey]) {
            return { handlers: this.routes[exactKey], params: {} };
        }

        // Pattern match with path parameters
        for (const [routeKey, handlers] of Object.entries(this.routes)) {
            const [routeMethod, routePath] = routeKey.split(':');
            if (routeMethod !== method) continue;

            const params = this.matchPathParams(routePath, path);
            if (params) {
                return { handlers, params };
            }
        }

        return null;
    }

    /**
     * Match path parameters
     * @private
     */
    matchPathParams(routePath, requestPath) {
        const routeParts = routePath.split('/').filter(Boolean);
        const requestParts = requestPath.split('/').filter(Boolean);

        if (routeParts.length !== requestParts.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const requestPart = requestParts[i];

            if (routePart.startsWith(':')) {
                // Path parameter
                const paramName = routePart.slice(1);
                params[paramName] = requestPart;
            } else if (routePart !== requestPart) {
                // Path doesn't match
                return null;
            }
        }

        return params;
    }

    /**
     * Execute middleware chain
     * @private
     */
    async executeMiddleware(middlewares, req, res) {
        let index = 0;

        const next = async (error) => {
            if (error) {
                throw error;
            }

            if (index >= middlewares.length) {
                return;
            }

            const middleware = middlewares[index++];
            await middleware(req, res, next);
        };

        await next();
    }

    /**
     * Default error handler
     * @private
     */
    defaultErrorHandler(error, req) {
        const logger = createLogger({ requestId: req.requestId });
        logger.error('Request failed', error);

        if (error instanceof AppError) {
            return createResponse(error.statusCode, {
                success: false,
                error: error.message,
                ...(error.details && { details: error.details })
            });
        }

        return createResponse(500, {
            success: false,
            error: 'Internal server error'
        });
    }

    /**
     * Handle Lambda event
     * @param {Object} event - Lambda event
     * @param {Object} context - Lambda context
     * @returns {Object} Lambda response
     */
    async handle(event, context) {
        const startTime = Date.now();

        try {
            // Parse event
            const parsedEvent = parseEvent(event);

            // Match route
            const match = this.matchRoute(event);

            if (!match) {
                return createResponse(404, {
                    success: false,
                    error: 'Route not found'
                });
            }

            // Create request and response objects
            const req = {
                event,
                context,
                ...parsedEvent,
                params: match.params,
                requestId: context.requestId,
                method: event.httpMethod || event.requestContext?.http?.method,
                path: event.path || event.requestContext?.http?.path
            };

            const res = {
                body: null,
                statusCode: 200,
                headers: this.cors ? {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true
                } : {},
                send: function(statusCode, data) {
                    this.statusCode = statusCode;
                    this.body = data;
                    return this;
                },
                json: function(data) {
                    this.body = data;
                    return this;
                },
                status: function(code) {
                    this.statusCode = code;
                    return this;
                }
            };

            // Execute global middlewares + route handlers
            const allHandlers = [...this.globalMiddlewares, ...match.handlers];
            await this.executeMiddleware(allHandlers, req, res);

            // Build response
            const duration = Date.now() - startTime;
            this.logger.info('Request completed', {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`
            });

            return createResponse(res.statusCode, res.body, res.headers);

        } catch (error) {
            return this.errorHandler(error, {
                event,
                context,
                requestId: context.requestId
            });
        }
    }

    /**
     * Create Lambda handler function
     * @returns {Function}
     */
    lambda() {
        return (event, context) => this.handle(event, context);
    }

    /**
     * Create Express router
     * @returns {Function} Express middleware
     */
    express() {
        return async (req, res, next) => {
            try {
                // Convert Express request to Lambda-like event
                const event = {
                    httpMethod: req.method,
                    path: req.path,
                    pathParameters: req.params || {},
                    queryStringParameters: req.query || {},
                    headers: req.headers || {},
                    body: req.body,
                    requestContext: {
                        requestId: req.requestId || req.id,
                        identity: {
                            sourceIp: req.ip,
                            userAgent: req.get('user-agent')
                        },
                        http: {
                            method: req.method,
                            path: req.path
                        }
                    },
                    resource: req.route?.path
                };

                const context = {
                    requestId: req.requestId || req.id,
                    functionName: 'express-router'
                };

                // Handle the request
                const result = await this.handle(event, context);

                // Set headers
                if (result.headers) {
                    Object.entries(result.headers).forEach(([key, value]) => {
                        res.setHeader(key, value);
                    });
                }

                // Parse body if string
                const body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;

                // Send response
                res.status(result.statusCode).json(body);

            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Mount router to Express app
     * @param {Object} app - Express app
     * @param {string} basePath - Base path for routes (optional)
     */
    mountExpress(app, basePath = '') {
        // Add all routes to Express app
        Object.entries(this.routes).forEach(([routeKey, handlers]) => {
            const [method, path] = routeKey.split(':');
            const fullPath = basePath + path;
            const expressMethod = method.toLowerCase();

            // Convert path parameters format from :id to :id (already compatible)
            const expressPath = fullPath;

            // Wrap handlers with async error handling
            const wrappedHandlers = handlers.map(handler => {
                return async (req, res, next) => {
                    try {
                        // Create Lambda-like req/res objects
                        const lambdaReq = {
                            event: {
                                httpMethod: req.method,
                                path: req.path,
                                headers: req.headers,
                                body: req.body
                            },
                            context: {
                                requestId: req.requestId
                            },
                            body: req.body,
                            headers: req.headers,
                            pathParameters: req.params,
                            params: req.params,
                            queryStringParameters: req.query,
                            requestContext: {
                                identity: {
                                    sourceIp: req.ip
                                }
                            },
                            method: req.method,
                            path: req.path,
                            requestId: req.requestId,
                            user: req.user // Preserve Express user object
                        };

                        const lambdaRes = {
                            statusCode: 200,
                            headers: {},
                            body: null,
                            json: function(data) {
                                this.body = data;
                                return this;
                            },
                            status: function(code) {
                                this.statusCode = code;
                                return this;
                            },
                            send: function(code, data) {
                                this.statusCode = code;
                                this.body = data;
                                return this;
                            }
                        };

                        // Call handler
                        await handler(lambdaReq, lambdaRes, async (error) => {
                            if (error) {
                                return next(error);
                            }
                        });

                        // If body was set, send response
                        if (lambdaRes.body !== null) {
                            // Set custom headers
                            Object.entries(lambdaRes.headers).forEach(([key, value]) => {
                                res.setHeader(key, value);
                            });

                            // Preserve Express user in request
                            if (lambdaReq.user) {
                                req.user = lambdaReq.user;
                            }

                            res.status(lambdaRes.statusCode).json(lambdaRes.body);
                        } else {
                            next();
                        }
                    } catch (error) {
                        next(error);
                    }
                };
            });

            // Register route with Express
            if (app[expressMethod]) {
                app[expressMethod](expressPath, ...wrappedHandlers);
            }
        });

        return app;
    }
}

/**
 * Create a new router instance
 * @param {Object} options - Router options
 * @returns {Router}
 */
function createRouter(options) {
    return new Router(options);
}

/**
 * Common middleware: CORS
 */
function corsMiddleware(options = {}) {
    const origin = options.origin || '*';
    const methods = options.methods || 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
    const headers = options.headers || 'Content-Type,Authorization,X-Requested-With';

    return async (req, res, next) => {
        res.headers['Access-Control-Allow-Origin'] = origin;
        res.headers['Access-Control-Allow-Methods'] = methods;
        res.headers['Access-Control-Allow-Headers'] = headers;

        if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.body = '';
            return;
        }

        await next();
    };
}

/**
 * Common middleware: Request logging
 */
function requestLoggerMiddleware(logger) {
    return async (req, res, next) => {
        const log = logger || createLogger({ requestId: req.requestId });
        log.info('Incoming request', {
            method: req.method,
            path: req.path,
            ip: req.requestContext?.identity?.sourceIp
        });
        await next();
    };
}

/**
 * Common middleware: Authentication
 */
function authMiddleware(options = {}) {
    return async (req, res, next) => {
        const token = req.headers?.Authorization || req.headers?.authorization;

        if (!token) {
            throw new AppError('Missing authentication token', 401);
        }

        // Custom validation function
        if (options.validate) {
            req.user = await options.validate(token);
        }

        await next();
    };
}

/**
 * Common middleware: Body parser
 */
function bodyParserMiddleware() {
    return async (req, res, next) => {
        if (req.body && typeof req.body === 'string') {
            try {
                req.body = JSON.parse(req.body);
            } catch (error) {
                throw new AppError('Invalid JSON in request body', 400);
            }
        }
        await next();
    };
}

module.exports = {
    Router,
    createRouter,
    corsMiddleware,
    requestLoggerMiddleware,
    authMiddleware,
    bodyParserMiddleware
};
