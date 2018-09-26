const _ = require('lodash');
const common = require('../../../../lib/common');

module.exports = {
    add(options) {
        // will remove unwanted null values
        _.each(options.data[docName], (value, index) => {
            if (!_.isObject(options.data[docName][index])) {
                return;
            }

            options.data[docName][index] = _.omitBy(options.data[docName][index], _.isNull);
        });
    },

    edit: this.add
};
