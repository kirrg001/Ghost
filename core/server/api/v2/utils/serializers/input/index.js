module.exports = {
    get posts() {
        return require('./posts');
    },

    get pages() {
        return require('./pages');
    },

    get all() {
        return require('./all');
    },

    get options() {
        return require('./options');
    }
};

