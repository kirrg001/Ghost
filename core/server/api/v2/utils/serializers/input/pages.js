module.exports = {
    all(config, options) {
        if (options.modelOptions.context.public) {
            options.modelOptions.filter = 'page:true';
        }
    }
};
