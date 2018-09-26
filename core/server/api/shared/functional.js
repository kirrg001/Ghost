const Promise = require('bluebird');
const _ = require('lodash');
const shared = require('../shared');

const functional = (api, utils) => {
    const keys = Object.keys(api);

    return keys.reduce((obj, key) => {
        const docName = api.docName;
        const method = key;

        const apiImpl = _.cloneDeep(api[key]);

        obj[key] = function wrapper() {
            let options, data;

            if (arguments.length === 2) {
                data = arguments[0];
                options = arguments[1];
            } else if (arguments.length === 1) {
                options = arguments[0] || {};
            } else {
                options = {};
            }

            if (!(options instanceof shared.Options)) {
                options = new shared.Options({
                    data: data,
                    apiOptions: Object.assign({context: {}}, options)
                });
            }

            return Promise.resolve()
                .then(() => {
                    if (apiImpl.validation && apiImpl.validation.before) {
                        return apiImpl.validation.before(options);
                    }
                })
                .then(() => {
                    if (apiImpl.validation) {
                        if (typeof apiImpl.validation === 'function') {
                            return apiImpl.validation(options);
                        }

                        const config = {docName, method};

                        if (apiImpl.validation.config) {
                            Object.assign(config, apiImpl.validation.config);
                        } else if (typeof apiImpl.validation !== 'boolean') {
                            Object.assign(config, apiImpl.validation);
                        } else {
                            Object.assign(config, {});
                        }

                        return utils.validators.handle(config, options);
                    }
                })
                .then(() => {
                    if (apiImpl.validation && apiImpl.validation.after) {
                        return apiImpl.validation.after(options);
                    }
                })
                .then(() => {
                    const config = {docName, method};
                    return utils.serializers.handle.input(config, options);
                })
                .then(() => {
                    if (apiImpl.permissions && apiImpl.permissions.before) {
                        return apiImpl.permissions.before(options);
                    }
                })
                .then(() => {
                    if (apiImpl.permissions) {
                        if (typeof apiImpl.permissions === 'function') {
                            return apiImpl.permissions(options);
                        }

                        const config = {docName, method};

                        if (apiImpl.permissions.config) {
                            Object.assign(config, apiImpl.permissions.config);
                        } else if (typeof apiImpl.permissions !== 'boolean') {
                            Object.assign(config, apiImpl.permissions);
                        } else {
                            Object.assign(config, {});
                        }

                        return utils.permissions.handle(config, options);
                    }
                })
                .then(() => {
                    if (apiImpl.permissions && apiImpl.permissions.after) {
                        return apiImpl.permissions.after(options);
                    }
                })
                .then(() => {
                    return apiImpl.query(options);
                })
                .then((models) => {
                    return utils.serializers.handle.output(models, {docName, method}, options);
                })
                .then(() => {
                    return options.response;
                });
        };

        Object.assign(obj[key], apiImpl);
        return obj;
    }, {});
};

module.exports = functional;
