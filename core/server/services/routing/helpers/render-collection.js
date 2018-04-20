'use strict';

const debug = require('ghost-ignition').debug('services:routing:helpers:render-collection'),
    formatResponse = require('./format-response'),
    renderer = require('./renderer');

module.exports = function renderCollection(req, res) {
    debug('renderCollection called');
    return function renderCollection(result) {
        // Renderer begin
        // Format data 2
        // Do final data formatting and then render
        // Render Call
        return renderer(req, res, formatResponse.collection(result));
    };
};
