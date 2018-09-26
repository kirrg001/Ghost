const _ = require('lodash');

const trimAndLowerCase = (params) => {
    params = params || '';
    if (_.isString(params)) {
        params = params.split(',');
    }

    return params.map((item) => {
        return item.trim().toLowerCase();
    });
};

module.exports = {
    all(config, options, local = {forModel: true}) {
        options.modelOptions = _.cloneDeep(options.apiOptions);

        if (options.modelOptions.include) {
            options.modelOptions.include = _.intersection(trimAndLowerCase(options.modelOptions.include), config.include);

            if (local.forModel) {
                options.modelOptions.withRelated = options.modelOptions.include;
                delete options.modelOptions.include;
            }
        }

        if (options.modelOptions.fields) {
            options.modelOptions.fields = trimAndLowerCase(options.modelOptions.fields);

            options.modelOptions.columns = options.modelOptions.fields;
            delete options.modelOptions.fields;
        }

        if (options.modelOptions.formats) {
            options.modelOptions.formats = _.intersection(trimAndLowerCase(options.modelOptions.formats), config.formats);
        }

        if (options.modelOptions.formats && options.modelOptions.columns) {
            options.modelOptions.columns = options.modelOptions.columns.concat(options.modelOptions.formats);
        }
    }
};
