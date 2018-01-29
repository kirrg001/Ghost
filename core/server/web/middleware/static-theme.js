'use strict';

const _ = require('lodash'),
    express = require('express'),
    path = require('path'),
    config = require('../../config'),
    constants = require('../../lib/constants'),
    themeUtils = require('../../services/themes'),
    settingsCache = require('../../services/settings/cache');

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json', ''],
        ext = path.extname(file);
    return _.includes(blackListedFileTypes, ext);
}

function isWhiteListedFile(file) {
    var whiteListedFiles = ['manifest.json'],
        base = path.basename(file);
    return _.includes(whiteListedFiles, base);
}

function forwardToExpressStatic(req, res, next) {
    if (!themeUtils.getActive()) {
        return next();
    }

    const configMaxAge = config.get('caching:theme:maxAge'),
        revPath = require('rev-path');

    // CASE: rewrite url, ensure we always read the un-hashed file from disk
    req.url = revPath.revert(req.path, settingsCache.get('theme_hash'));

    express.static(themeUtils.getActive().path,
        {maxAge: (configMaxAge || configMaxAge === 0) ? configMaxAge : constants.ONE_YEAR_MS}
    )(req, res, next);
}

function staticTheme() {
    return function blackListStatic(req, res, next) {
        if (!isWhiteListedFile(req.path) && isBlackListedFileType(req.path)) {
            return next();
        }
        return forwardToExpressStatic(req, res, next);
    };
}

module.exports = staticTheme;
