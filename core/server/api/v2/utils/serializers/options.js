const _ = require('lodash');

module.exports = {
    convert(options, config = {forModel: true}) {
        options.modelOptions = _.cloneDeep(options.apiOptions);

        if (options.modelOptions.include) {
            if (config.forModel) {
                options.modelOptions.withRelated = options.modelOptions.include;
                delete options.modelOptions.include;
            }
        }

        if (options.modelOptions.fields) {
            options.modelOptions.columns = options.modelOptions.fields;
            delete options.modelOptions.fields;
        }

        if (options.modelOptions.formats && options.modelOptions.columns) {
            options.modelOptions.columns = options.modelOptions.columns.concat(options.modelOptions.formats);
        }
    }
};
