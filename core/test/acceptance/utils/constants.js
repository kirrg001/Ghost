const _ = require('lodash');

module.exports.CACHE_RULES = {
    public: 'public, max-age=0',
    hour: 'public, max-age=' + 3600,
    day: 'public, max-age=' + 86400,
    year: 'public, max-age=' + 31536000,
    private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
};

module.exports.URL = {
    content(route) {
        const api_version = require('./api_version');
        const url = require('url');
        const API_URL = `/ghost/api/${api_version}/content/`;

        return url.resolve(API_URL, route);
    },

    admin(route) {
        const api_version = require('./api_version');
        const url = require('url');
        const API_URL = `/ghost/api/${api_version}/admin/`;

        return url.resolve(API_URL, route);
    }
};

module.exports.API_KEYS = {
    CONTENT: _.repeat('c', 26),
    ADMIN({endpoint, apiKeyId, secret}) {
        const jwt = require('jsonwebtoken');

        const JWT_OPTIONS = {
            keyid: apiKeyId,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: endpoint
        };

        return jwt.sign(
            {},
            Buffer.from(secret, 'hex'),
            JWT_OPTIONS
        );
    }
};
