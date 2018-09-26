const shared = require('../../shared');
const localUtils = require('../utils');

module.exports = {
    get http() {
        return require('../../shared/http');
    },

    get posts() {
        return shared.functional(require('./posts'), localUtils);
    },

    get pages() {
        return shared.functional(require('./posts'), localUtils);
    },

    get users() {
        return shared.functional(require('./users'), localUtils);
    }
};
