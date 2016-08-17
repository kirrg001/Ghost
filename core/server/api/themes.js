// # Themes API
// RESTful API for Themes
var Promise = require('bluebird'),
    _ = require('lodash'),
    gscan = require('gscan'),
    fs = require('fs-extra'),
    config = require('../config'),
    errors = require('../errors'),
    storage = require('../storage'),
    execFile = require('child_process').execFile,
    settings = require('./settings'),
    pipeline = require('../utils/pipeline'),
    utils = require('./utils'),
    i18n = require('../i18n'),
    docName = 'themes',
    themes;

/**
 * ### Fetch Active Theme
 * @returns {Theme} theme
 */

function fetchActiveTheme() {
    return settings.read({
        key: 'activeTheme',
        context: {
            internal: true
        }
    }).then(function (response) {
        return response.settings[0].value;
    });
}

/**
 * ### Fetch Available Themes
 * @returns {Themes} themes
 */

function fetchAvailableThemes() {
    var themes = {};

    _.each(config.paths.availableThemes, function (theme, name) {
        var isTheme = name.indexOf('.') !== 0 && name !== '_messages' && name.toLowerCase() !== 'readme.md';

        if (!isTheme) {
            return;
        }

        themes[name] = theme;
    });

    return themes;
}

/**
 * ### Activate Theme
 * @param {Theme} theme
 * @returns {Object} response
 */

function activateTheme(theme) {
    return settings.edit({
        settings: [{
            key: 'activeTheme',
            value: theme.name
        }],
        context: {
            internal: true
        }
    }).then(function () {
        theme.active = true;

        return {themes: [theme]};
    });
}

/**
 * ## Themes API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
themes = {
    /**
     * ### Browse
     * Get a list of all the available themes
     * @param {{context}} options
     * @returns {Promise(Themes)}
     */
    browse: function browse(options) {
        var tasks;

        /**
         * ### Model Query
         * @returns {Object} result
         */

        function modelQuery() {
            var result = {
                availableThemes: fetchAvailableThemes(),
                activeTheme: fetchActiveTheme()
            };

            return Promise.props(result);
        }

        /**
         * ### Build response
         * @param {Object} result - result from modelQuery()
         * @returns {Object} response
         */

        function buildResponse(result) {
            var themes = [];

            _.each(result.availableThemes, function (theme, name) {
                var item = {
                    active: result.activeTheme === name,
                    uuid: name
                };

                // if theme has package.json file,
                // merge its properties
                if (theme['package.json']) {
                    item = _.merge(item, theme['package.json']);
                }

                themes.push(item);
            });

            return {themes: themes};
        }

        tasks = [
            utils.validate(docName),
            utils.handlePublicPermissions(docName, 'browse'),
            modelQuery,
            buildResponse
        ];

        return pipeline(tasks, options || {});
    },

    /**
     * ### Edit
     * Change the active theme
     * @param {Theme} object
     * @param {{context}} options
     * @returns {Promise(Theme)}
     */
    edit: function edit(object, options) {
        var tasks, themeName;

        // Check whether the request is properly formatted.
        if (!_.isArray(object.themes)) {
            return Promise.reject(new errors.BadRequestError(i18n.t('errors.api.themes.invalidRequest')));
        }

        themeName = object.themes[0].uuid;

        /**
         * ### Model Query
         * @param {Object} options
         * @returns {Theme} theme
         */

        function modelQuery(options) {
            return themes.browse(options).then(function (response) {
                var theme = _.find(response.themes, function (theme) {
                    return theme.uuid === themeName;
                });

                if (!theme) {
                    return Promise.reject(new errors.BadRequestError(i18n.t('errors.api.themes.themeDoesNotExist')));
                }

                if (!theme.name) {
                    theme.name = themeName;
                }

                return theme;
            });
        }

        tasks = [
            utils.validate(docName),
            utils.handlePermissions(docName, 'edit'),
            modelQuery,
            activateTheme
        ];

        return pipeline(tasks, options || {});
    },

    upload: function upload(options) {
        var zip = {
            path: options.path,
            name: options.originalname,
            shortName: options.originalname.split('.zip')[0]
        }, theme, store = storage.getStorage();

        // Check if zip name is casper.zip
        if (zip.name === 'casper.zip') {
            throw new errors.ValidationError(i18n.t('errors.api.themes.overrideCasper'));
        }

        return utils.handlePermissions('themes', 'add')(options)
            .then(function () {
                return gscan.checkZip(zip, {keepExtractedDir: true})
            })
            .then(function (_theme) {
                theme = _theme;
                theme = gscan.format(theme);

                if (theme.results.error.length) {
                    var validationErrors = [];

                    _.each(theme.results.error, function (error) {
                        validationErrors.push(new errors.ValidationError(i18n.t('errors.api.themes.invalidTheme', {reason: error.rule})));
                    });

                    throw validationErrors;
                }
            })
            .then(function () {
                //@TODO: what if store.exists fn is undefined?
                return store.exists(config.paths.themePath + '/' + zip.shortName);
            })
            .then(function (zipExists) {
                // override theme, remove zip and extracted folder
                if (zipExists) {
                    fs.removeSync(config.paths.themePath + '/' + zip.shortName);
                }

                // store extracted theme
                return store.save({
                    name: zip.shortName,
                    path: theme.path
                }, config.paths.themePath);
            })
            .then(function () {
                // force reload of availableThemes
                // right now the logic is in the ConfigManager
                // if we create a theme collection, we don't have to read them from disk
                return config.loadThemesAndApps();
            })
            .then(function () {
                // the settings endpoint is used to fetch the availableThemes
                // so we have to force updating the in process cache
                return settings.updateSettingsCache();
            })
            .then(function () {
                // gscan returns the name of the package.json
                // the whole theme handling in ghost relies on folder-name
                theme.name = zip.shortName;
                return {themes: [theme]};
            })
            .finally(function () {
                //remove uploaded zip
                fs.removeSync(zip.path);

                //remove extracted dir
                //@TODO: theme.path is a relative path?
                //@TODO: recursive dir remove, because /uuid/zip-name
                if (theme) {
                    fs.removeSync(theme.path);
                }
            })
    },

    download: function download(object, options) {
        if (!_.isArray(object.themes)) {
            return Promise.reject(new errors.BadRequestError(i18n.t('errors.api.themes.invalidRequest')));
        }

        var themeName = object.themes[0].uuid,
            theme = config.paths.availableThemes[themeName],
            themePath = config.paths.themePath + '/' + themeName,
            zipName = themeName + '.zip',
            zipPath = config.paths.themePath + '/' + zipName;

        if (!theme) {
            return Promise.reject(new errors.BadRequestError(i18n.t('errors.api.themes.invalidRequest')));
        }

        return utils.handlePermissions('themes', 'read')(options)
            .then(function () {
                if (fs.existsSync(zipPath)) {
                    return Promise.resolve();
                }

                return new Promise(function (resolve, reject) {
                    execFile('zip', ['-r', '-j', zipPath, themePath], function (err) {
                        if (err) {
                            return reject(err);
                        }

                        resolve();
                    });
                });
            })
            .then(function () {
                var stream = fs.createReadStream(zipPath);
                return stream;
            })
    }
};

module.exports = themes;
