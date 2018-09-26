module.exports = {
    all(options) {
        if (options.modelOptions.context.public) {
            options.modelOptions.filter = 'page:true';
        }
    }
};
