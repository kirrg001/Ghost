const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:tags');
const url = require('./utils/url');

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');
    },

    read() {
        debug('read');

        this.browse(...arguments);
    },

    add(apiConfig, frame) {
        debug('add');
        frame.data.tags[0] = url.forTag(Object.assign({}, frame.data.tags[0]));
    },

    edit(apiConfig, frame) {
        debug('edit');
        this.add(apiConfig, frame);
    }
};
