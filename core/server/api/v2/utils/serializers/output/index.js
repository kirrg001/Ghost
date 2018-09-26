module.exports = {
    get posts() {
        return require('./posts');
    },

    get pages() {
        return require('./pages');
    },

    get users() {
        return require('./users');
    }
};
