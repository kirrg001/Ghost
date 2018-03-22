'use strict';

const _ = require('lodash'),
    ghostBookshelf = require('./base'),
    Basetoken = require('./base/token'),
    common = require('../lib/common');

let Accesstoken,
    Accesstokens;

Accesstoken = Basetoken.extend({
    tableName: 'accesstokens',

    emitChange: function emitChange(event) {
        // Event named 'token' as access and refresh token will be merged in future, see #6626
        common.events.emit('token' + '.' + event, this);
    },

    onCreated: function onCreated(model, attrs, options) {
        const clonedModel = _.cloneDeep(model),
            triggerEvents = () => {
                clonedModel.emitChange('added', options);
            };

        if (options.transacting) {
            options.transacting.once('committed', (committed) => {
                if (!committed) {
                    return;
                }

                triggerEvents();
            });
        } else {
            triggerEvents();
        }
    }
});

Accesstokens = ghostBookshelf.Collection.extend({
    model: Accesstoken
});

module.exports = {
    Accesstoken: ghostBookshelf.model('Accesstoken', Accesstoken),
    Accesstokens: ghostBookshelf.collection('Accesstokens', Accesstokens)
};
