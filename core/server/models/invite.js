'use strict';

const crypto = require('crypto'),
    constants = require('../lib/constants'),
    ghostBookshelf = require('./base');

let Invite,
    Invites;

Invite = ghostBookshelf.Model.extend({
    tableName: 'invites',

    toJSON: function (unfilteredOptions) {
        var options = Invite.filterOptions(unfilteredOptions, 'toJSON'),
            attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        delete attrs.token;
        return attrs;
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {};
    },

    processOptions: function processOptions(options) {
        return options;
    },

    add: function add(data, unfilteredOptions) {
        const options = Invite.filterOptions(unfilteredOptions, 'add'),
            hash = crypto.createHash('sha256');

        let text = '';

        data.expires = Date.now() + constants.ONE_WEEK_MS;

        if (data.status && !options.context || !options.context.internal) {
            data.status = 'pending';
        }

        // @TODO: call a util fn?
        hash.update(String(data.expires));
        hash.update(data.email.toLocaleLowerCase());
        text += [data.expires, data.email, hash.digest('base64')].join('|');
        data.token = new Buffer(text).toString('base64');

        return ghostBookshelf.Model.add.call(this, data, options);
    }
});

Invites = ghostBookshelf.Collection.extend({
    model: Invite
});

module.exports = {
    Invite: ghostBookshelf.model('Invite', Invite),
    Invites: ghostBookshelf.collection('Invites', Invites)
};
