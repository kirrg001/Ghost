const Promise = require('bluebird');
const _ = require('lodash');
const permissions = require('../../../services/permissions');
const common = require('../../../lib/common');

module.exports = {
    admin(config) {
        let singular = config.docName.replace(/s$/, '');

        return function doHandlePermissions(options) {
            let unsafeAttrObject = config.unsafeAttrNames && _.has(options, `data.[${config.docName}][0]`) ? _.pick(options.data[config.docName][0], config.unsafeAttrNames) : {},
                permsPromise = permissions.canThis(options.context)[config.method][singular](options.id, unsafeAttrObject);

            return permsPromise.then((result) => {
                /*
                 * Allow the permissions function to return a list of excluded attributes.
                 * If it does, omit those attrs from the data passed through
                 *
                 * NOTE: excludedAttrs differ from unsafeAttrs in that they're determined by the model's permissible function,
                 * and the attributes are simply excluded rather than throwing a NoPermission exception
                 *
                 * TODO: This is currently only needed because of the posts model and the contributor role. Once we extend the
                 * contributor role to be able to edit existing tags, this concept can be removed.
                 */
                if (result && result.excludedAttrs && _.has(options, `data.[${config.docName}][0]`)) {
                    options.data[config.docName][0] = _.omit(options.data[config.docName][0], result.excludedAttrs);
                }

                return options;
            }).catch((err) => {
                if (err instanceof common.errors.NoPermissionError) {
                    err.message = common.i18n.t('errors.api.utils.noPermissionToCall', {
                        method: config.method,
                        docName: config.docName
                    });
                    return Promise.reject(err);
                }

                if (common.errors.utils.isIgnitionError(err)) {
                    return Promise.reject(err);
                }

                return Promise.reject(new common.errors.GhostError({
                    err: err
                }));
            });
        };
    }
};
