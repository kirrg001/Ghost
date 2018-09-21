const debug = require('ghost-ignition').debug('api');
const boolParser = require('express-query-boolean');
const express = require('express');
const bodyParser = require('body-parser');
const shared = require('../../../shared');
const routes = require('./routes');

module.exports = function setupApiApp() {
    debug('Content API v2 setup start');
    const apiApp = express();

    // API middleware

    // Query parsing
    // @NOTE: If we don't use the body parser for the content API, `req.body` would be undefined.
    apiApp.use(bodyParser.json({limit: '1mb'}));
    apiApp.use(boolParser());

    // send 503 json response in case of maintenance
    apiApp.use(shared.middlewares.maintenance);

    // API shouldn't be cached
    apiApp.use(shared.middlewares.cacheControl('private'));

    // Routing
    apiApp.use(routes());

    // API error handling
    apiApp.use(shared.middlewares.errorHandler.resourceNotFound);
    apiApp.use(shared.middlewares.errorHandler.handleJSONResponse);

    debug('Content API v2 setup end');

    return apiApp;
};
