module.exports = {
    get pages() {
        return require('./pages');
    },

    get posts() {
        return require('./posts');
    },

    get users() {
        return require('./users');
    }
};
