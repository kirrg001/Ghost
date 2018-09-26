const _ = require('lodash');

module.exports = {
    add(config, options) {
        // will remove unwanted null values
        _.each(options.data[config.docName], (value, index) => {
            if (!_.isObject(options.data[config.docName][index])) {
                return;
            }

            options.data[config.docName][index] = _.omitBy(options.data[config.docName][index], _.isNull);
        });
    },

    edit: this.add
};
