'use strict';

const Promise = require('bluebird'),
    _ = require('lodash'),
    ghostBookshelf = require('./base'),
    common = require('../lib/common');

let Webhook,
    Webhooks;

Webhook = ghostBookshelf.Model.extend({
    tableName: 'webhooks',

    emitChange: function emitChange(event, options) {
        options = options || {};

        common.events.emit('webhook' + '.' + event, this, options);
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
    },

    onUpdated: function onUpdated(model, attrs, options) {
        const clonedModel = _.cloneDeep(model),
            triggerEvents = () => {
                clonedModel.emitChange('edited', options);
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
    },

    onDestroyed: function onDestroyed(model, options) {
        const clonedModel = _.cloneDeep(model),
            triggerEvents = () => {
                clonedModel.emitChange('deleted', options);
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
}, {
    findAllByEvent: function findAllByEvent(event, unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'findAll'),
            webhooksCollection = Webhooks.forge();

        return webhooksCollection
            .query('where', 'event', '=', event)
            .fetch(options);
    },

    getByEventAndTarget: function getByEventAndTarget(event, targetUrl, unfilteredOptions) {
        var options = ghostBookshelf.Model.filterOptions(unfilteredOptions, 'getByEventAndTarget');
        options.require = true;

        return Webhooks.forge().fetch(options).then(function then(webhooks) {
            var webhookWithEventAndTarget = webhooks.find(function findWebhook(webhook) {
                return webhook.get('event').toLowerCase() === event.toLowerCase()
                    && webhook.get('target_url').toLowerCase() === targetUrl.toLowerCase();
            });

            if (webhookWithEventAndTarget) {
                return webhookWithEventAndTarget;
            }
        }).catch(function (error) {
            if (error.message === 'NotFound' || error.message === 'EmptyResponse') {
                return Promise.resolve();
            }

            return Promise.reject(error);
        });
    }
});

Webhooks = ghostBookshelf.Collection.extend({
    model: Webhook
});

module.exports = {
    Webhook: ghostBookshelf.model('Webhook', Webhook),
    Webhooks: ghostBookshelf.collection('Webhooks', Webhooks)
};
