// # Themes API
// RESTful API for Themes
var Promise = require('bluebird'),
    _ = require('lodash'),
    os = require('os'),
    gscan = require('gscan'),
    uuid = require('uuid'),
    fs = require('fs-extra'),
    execFileAsPromise = Promise.promisify(require('child_process').execFile),
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

        // check if zip name is casper.zip
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

                if (!theme.results.error.length) {
                    return;
                }

                var validationErrors = [];
                _.each(theme.results.error, function (error) {
                    if (error.failures) {
                        _.each(error.failures, function (childError) {
                            validationErrors.push(new errors.ValidationError(i18n.t('errors.api.themes.invalidTheme', {
                                reason: childError.ref
                            })));
                        });
                    }

                    validationErrors.push(new errors.ValidationError(i18n.t('errors.api.themes.invalidTheme', {
                        reason: error.rule
                    })));
                });

                throw validationErrors;
            })
            .then(function () {
                return store.exists(config.paths.themePath + '/' + zip.shortName);
            })
            .then(function (themeExists) {
                // delete existing theme
                if (themeExists) {
                    return storageAdapter.delete(zip.shortName, config.paths.themePath);
                }
            })
            .then(function () {
                return storageAdapter.exists(config.paths.themePath + '/' + zip.name);
            })
            .then(function (zipExists) {
                // delete existing theme zip
                if (zipExists) {
                    return storageAdapter.delete(zip.name, config.paths.themePath);
                }
            })
            .then(function () {
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
                // remove zip upload from multer
                // happens in background
                Promise.promisify(fs.removeSync)(zip.path)
                    .catch(function (err) {
                        errors.logError(err);
                    });

                // remove extracted dir from gscan
                // happens in background
                if (theme) {
                    Promise.promisify(fs.removeSync)(theme.path)
                        .catch(function (err) {
                            errors.logError(err);
                        });
                }
            })
    },

    download: function download(options) {
        var themeName = options.name,
            theme = config.paths.availableThemes[themeName],
            zipName = themeName + '.zip',
            zipPath = config.paths.themePath + '/' + zipName,
            themePath = config.paths.themePath + '/' + themeName,
            tempZipPath,
            storageAdapter = storage.getStorage('themes');

        if (!theme) {
            return Promise.reject(new errors.BadRequestError(i18n.t('errors.api.themes.invalidRequest')));
        }

        return utils.handlePermissions('themes', 'read')(options)
            .then(function () {
                return storageAdapter.exists(zipPath);
            })
            .then(function (zipExists) {
                // zip theme and store in tmppath
                if (!zipExists) {
                    tempZipPath = os.tmpdir() + '/' + uuid.v1() + '.zip';
                    return execFileAsPromise('zip', ['-r', '-j', tempZipPath, themePath]);
                }
            })
            .then(function () {
                // CASE: zip already exists
                if (!tempZipPath) {
                    return;
                }

                return storageAdapter.save({
                    name: zipName,
                    path: tempZipPath
                }, config.paths.themePath);
            })
            .then(function () {
                return storageAdapter.serve({isTheme: true, name: themeName});
            })
            .finally(function () {
                // delete temp zip file
                // happens in background
                if (tempZipPath) {
                    Promise.promisify(fs.remove)(tempZipPath)
                        .catch(function (err) {
                            errors.logError(err);
                        });
                }
            });
    },

    /**
     * remove theme zip
     * remove theme folder
     */
    destroy: function destroy(options) {
        var name = options.name,
            zipName = name + '.zip',
            theme,
            storageAdapter = storage.getStorage('themes');

        return utils.handlePermissions('themes', 'destroy')(options)
            .then(function () {
                if (name === 'casper') {
                    throw new errors.ValidationError(i18n.t('errors.api.themes.overrideCasper'));
                }

                theme = config.paths.availableThemes[name];

                if (!theme) {
                    throw new errors.NotFoundError(i18n.t('errors.api.themes.themeDoesNotExist'));
                }
                
                return storageAdapter.delete(name, config.paths.themePath);
            })
            .then(function () {
                return storageAdapter.delete(zipName, config.paths.themePath);
            })
            .then(function () {
                return config.loadThemes();
            })
            .then(function () {
                return settings.updateSettingsCache();
            });
    }
};

module.exports = themes;
