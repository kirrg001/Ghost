module.exports = {
    all(models, options) {
        if (!models) {
            return null;
        }

        if (models.meta) {
            return {
                posts: models.data.map(model => model.toJSON(options.modelOptions)),
                meta: models.meta
            };
        }

        return {
            posts: [models.toJSON(options.modelOptions)]
        };
    }
};
