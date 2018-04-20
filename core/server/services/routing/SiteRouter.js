'use strict';

/**
 * Site Router is the top level Router for the whole site
 */
const ParentRouter = require('./ParentRouter'),
    siteRouter = new ParentRouter('site');

module.exports = siteRouter;
