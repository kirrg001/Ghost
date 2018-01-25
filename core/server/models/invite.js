'use strict';

const crypto = require('crypto'),
    _ = require('lodash'),
    constants = require('../lib/constants'),
    ghostBookshelf = require('./base');

let Invite,
    Invites;

Invite = ghostBookshelf.Model.extend({
    tableName: 'invites',

    toJSON: function (options) {
        options = options || {};

        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);
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

    findOne: function findOne(data, options) {
        options = options || {};

        options = this.filterOptions(options, 'findOne');
        data = this.filterData(data, 'findOne');

        var invite = this.forge(data);
        return invite.fetch(options);
    },

    add: function add(data, options) {
        var hash = crypto.createHash('sha256'),
            text = '';

        options = this.filterOptions(options, 'add');

        data.expires = Date.now() + constants.ONE_WEEK_MS;
        data.status = 'pending';

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
