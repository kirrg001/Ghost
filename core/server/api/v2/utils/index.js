module.exports = {
    get validators() {
        return require('./validators');
    },

    get permissions() {
        return require('./permissions');
    },

    get serializers() {
        return require('./serializers');
    }
};
