var _ = require('lodash'),
    express = require('express'),
    path = require('path'),
    config = require('../../config'),
    constants = require('../../lib/constants'),
    themeUtils = require('../../services/themes');

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json'],
        ext = path.extname(file);
    return _.includes(blackListedFileTypes, ext);
}

function isWhiteListedFile(file) {
    var whiteListedFiles = ['manifest.json'],
        base = path.basename(file);
    return _.includes(whiteListedFiles, base);
}

// @TODO: 30ms
function isFile(file) {
    return path.extname(file) !== '';
}

function forwardToExpressStatic(req, res, next) {
    if (!themeUtils.getActive()) {
        return next();
    }

    var configMaxAge = config.get('caching:theme:maxAge');

    express.static(themeUtils.getActive().path,
        {maxAge: (configMaxAge || configMaxAge === 0) ? configMaxAge : constants.ONE_YEAR_MS}
    )(req, res, next);
}

function staticTheme() {
    return function blackListStatic(req, res, next) {
        if (!isFile(req.path)) {
            return next();
        }

        if (!isWhiteListedFile(req.path) && isBlackListedFileType(req.path)) {
            return next();
        }

        return forwardToExpressStatic(req, res, next);
    };
}

module.exports = staticTheme;
