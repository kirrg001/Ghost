const Promise = require('bluebird');
const _ = require('lodash');
const shared = require('../shared');

const functional = (api, utils) => {
    const keys = Object.keys(api);

    return keys.reduce((obj, key) => {
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
                    apiOptions: options
                });
            }

            return Promise.resolve()
                .then(() => {
                    if (apiImpl.validation) {
                        if (typeof apiImpl.validation === 'function') {
                            return apiImpl.validation(options);
                        }

                        return utils.validation.validate(apiImpl.validation, options);
                    }
                })
                .then(() => {
                    if (apiImpl.permissions) {
                        if (typeof apiImpl.permissions === 'function') {
                            return apiImpl.permissions(options);
                        }

                        if (apiImpl.permissions.content) {
                            return utils.permissions.content(apiImpl.permissions)(options);
                        }

                        return utils.permissions.admin(apiImpl.permissions)(options);
                    }
                })
                .then(() => {
                    return apiImpl.call(options);
                });
        };

        Object.assign(obj[key], apiImpl);
        return obj;
    }, {});
};

module.exports = functional;
