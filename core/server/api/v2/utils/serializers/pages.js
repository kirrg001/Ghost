module.exports = {
    input(options) {
        if (options.modelOptions.context.public) {
            options.modelOptions.filter = 'page:true';
        }
    },

    output() {

    }
};
