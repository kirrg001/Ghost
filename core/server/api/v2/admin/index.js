const shared = require('../../shared');
const localUtils = require('../utils');

module.exports = {
    get http() {
        return require('../../shared/http');
    },

    get posts() {
        return shared.functional(require('./posts'), localUtils);
    }
};
