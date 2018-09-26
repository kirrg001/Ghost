const _ = require('lodash');
const common = require('../../../../../lib/common/index');

module.exports = {
    add(config, options) {
        if (_.isEmpty(options.data) || _.isEmpty(options.data[config.docName]) || _.isEmpty(options.data[config.docName][0])) {
            throw new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.utils.noRootKeyProvided', {docName: config.docName})
            });
        }
    },

    edit: this.add
};
