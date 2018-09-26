module.exports = {
    all(models, config, options) {
        if (!models) {
            return null;
        }

        if (models.meta) {
            options.response = {
                posts: models.data.map(model => model.toJSON(options.modelOptions)),
                meta: models.meta
            };

            return;
        }

        options.response = {
            posts: [models.toJSON(options.modelOptions)]
        };
    }
};
