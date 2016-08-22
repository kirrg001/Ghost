// # Themes API
// RESTful API for Themes
var Promise = require('bluebird'),
    _ = require('lodash'),
    gscan = require('gscan'),
    fs = require('fs-extra'),
    config = require('../config'),
    errors = require('../errors'),
    storage = require('../storage'),
    settings = require('./settings'),
    pipeline = require('../utils/pipeline'),
    utils = require('./utils'),
    i18n = require('../i18n'),
    docName = 'themes',
    themes;

/**
 * ## Themes API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
themes = {
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
                return config.loadThemes();
            })
            .then(function () {
                // the settings endpoint is used to fetch the availableThemes
                // so we have to force updating the in process cache
                return settings.updateSettingsCache();
            })
            .then(function (settings) {
                // gscan theme structure !== ghost theme structure
                return {themes: [_.find(settings.availableThemes.value, {name: zip.shortName})]};
            })
            .finally(function () {
                //remove uploaded zip from multer
                fs.removeSync(zip.path);

                //remove extracted dir from gscan
                if (theme) {
                    fs.removeSync(theme.path);
                }
            })
    },

    download: function download(options) {
        var themeName = options.name,
            theme = config.paths.availableThemes[themeName],
            adapter = storage.getStorage();

        if (!theme) {
            return Promise.reject(new errors.BadRequestError(i18n.t('errors.api.themes.invalidRequest')));
        }

        return utils.handlePermissions('themes', 'read')(options)
            .then(function () {
                return adapter.serve({isTheme: true, name: themeName});
            });
    },

    //@TODO: replace sync operations
    destroy: function destroy(options) {
        var name = options.name, theme;

        return utils.handlePermissions('themes', 'destroy')(options)
            .then(function () {
                if (name === 'casper') {
                    throw new errors.ValidationError(i18n.t('errors.api.themes.overrideCasper'));
                }

                theme = config.paths.availableThemes[name];

                if (!theme) {
                    throw new errors.NotFoundError(i18n.t('errors.api.themes.themeDoesNotExist'));
                }

                fs.removeSync(config.paths.themePath + '/' + name);
                fs.removeSync(config.paths.themePath + '/' + name + '.zip');

                return config.loadThemes();

            })
            .then(function () {
                return settings.updateSettingsCache();
            });
    }
};

module.exports = themes;
