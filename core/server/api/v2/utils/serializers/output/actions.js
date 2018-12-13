const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:actions');

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            actions: models.data.map(model => model.toJSON()),
            meta: models.meta
        };

        debug(frame.response);
    }
};
