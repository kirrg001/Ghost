// # Ghost Startup
// Orchestrates the startup of Ghost when run from command line.

var express,
    ghost,
    parentApp,
    utils,
    errors;

require('./core/server/overrides');

// Proceed with startup
express = require('express');
ghost = require('./core');
errors = require('./core/server/errors');
utils = require('./core/server/utils');

// Create our parent express app instance.
parentApp = express();

// Call Ghost to get an instance of GhostServer
ghost().then(function (ghostServer) {
    // Mount our Ghost instance on our desired subdirectory path if it exists.
    parentApp.use(utils.url.getSubdir(), ghostServer.rootApp);

    // Let Ghost handle starting our server instance.
    ghostServer.start(parentApp);
}).catch(function (err) {
    errors.logErrorAndExit(err, err.context, err.help);
});
