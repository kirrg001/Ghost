const express = require('express'),
    // This essentially provides the controllers for the routes
    api = require('../../../../api').content,

    // Middleware
    mw = require('./middleware'),

    // API specific
    cors = require('../../../middleware/api/cors'),

    // Temporary
    // @TODO find a more appy way to do this!
    labs = require('../../../middleware/labs');

// @TODO refactor/clean this up - how do we want the routing to work long term?
module.exports = function apiRoutes() {
    const apiRouter = express.Router();

    // alias delete with del
    apiRouter.del = apiRouter.delete;

    // ## CORS pre-flight check
    apiRouter.options('*', cors);

    // ## Configuration
    apiRouter.get('/configuration', api.http(api.configuration.read));

    // ## Posts
    apiRouter.get('/posts', mw.authenticatePublic, api.http(api.posts.browse));
    apiRouter.get('/posts/:id', mw.authenticatePublic, api.http(api.posts.read));
    apiRouter.get('/posts/slug/:slug', mw.authenticatePublic, api.http(api.posts.read));

    // ## Users
    apiRouter.get('/users', mw.authenticatePublic, api.http(api.users.browse));
    apiRouter.get('/users/:id', mw.authenticatePublic, api.http(api.users.read));
    apiRouter.get('/users/slug/:slug', mw.authenticatePublic, api.http(api.users.read));

    // ## Tags
    apiRouter.get('/tags', mw.authenticatePublic, api.http(api.tags.browse));
    apiRouter.get('/tags/:id', mw.authenticatePublic, api.http(api.tags.read));
    apiRouter.get('/tags/slug/:slug', mw.authenticatePublic, api.http(api.tags.read));

    // ## Subscribers
    apiRouter.post('/subscribers', labs.subscribers, mw.authenticatePublic, api.http(api.subscribers.add));

    return apiRouter;
};
