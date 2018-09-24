module.exports = {
    get validate() {
        return require('./validate');
    },

    get options() {
        return require('./options');
    },

    get posts() {
        return require('./posts');
    }
};
