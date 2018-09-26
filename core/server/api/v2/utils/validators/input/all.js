const _ = require('lodash');
const common = require('../../../../../lib/common/index');

module.exports = {
    add(options) {
        if (_.isEmpty(options.data) || _.isEmpty(options.data[docName]) || _.isEmpty(options.data[docName][0])) {
            throw new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.utils.noRootKeyProvided', {docName: docName})
            });
        }
    },

    edit: this.add
};
