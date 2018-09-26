module.exports = {
    all(models, options) {
        if (models.meta) {
            return {
                pages: models.data.map(model => model.toJSON(options.modelOptions)),
                meta: models.meta
            };
        }

        return {
            pages: [models.toJSON(options.modelOptions)]
        };
    }
};
