module.exports = {
    all(models, config, options) {
        if (models.meta) {
            options.response = {
                pages: models.data.map(model => model.toJSON(options.modelOptions)),
                meta: models.meta
            };

            return;
        }

        options.response = {
            pages: [models.toJSON(options.modelOptions)]
        };
    }
};
