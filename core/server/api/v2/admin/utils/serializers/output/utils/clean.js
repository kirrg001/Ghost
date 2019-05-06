const _ = require('lodash');
const localUtils = require('../../../index');

const tag = (attrs, frame) => {
    // Already deleted in model.toJSON, but leaving here so that we can clean that up when we deprecate v0.1
    delete attrs.parent_id;

    // @NOTE: unused fields
    delete attrs.parent;

    return attrs;
};

const author = (attrs, frame) => {
    // @NOTE: unused fields
    delete attrs.visibility;
    delete attrs.locale;
    delete attrs.ghost_auth_id;

    return attrs;
};

const post = (attrs, frame) => {
    delete attrs.page;

    if (!attrs.tags) {
        delete attrs.primary_tag;
    }

    if (!attrs.authors) {
        delete attrs.primary_author;
    }

    delete attrs.locale;
    delete attrs.visibility;
    delete attrs.author;

    return attrs;
};

const action = (attrs) => {
    if (attrs.actor) {
        delete attrs.actor_id;
        delete attrs.resource_id;

        if (attrs.actor_type === 'user') {
            attrs.actor = _.pick(attrs.actor, ['id', 'name', 'slug', 'profile_image']);
            attrs.actor.image = attrs.actor.profile_image;
            delete attrs.actor.profile_image;
        } else {
            attrs.actor = _.pick(attrs.actor, ['id', 'name', 'slug', 'icon_image']);
            attrs.actor.image = attrs.actor.icon_image;
            delete attrs.actor.icon_image;
        }
    } else if (attrs.resource) {
        delete attrs.actor_id;
        delete attrs.resource_id;

        // @NOTE: we only support posts right now
        attrs.resource = _.pick(attrs.resource, ['id', 'title', 'slug', 'feature_image']);
        attrs.resource.image = attrs.resource.feature_image;
        delete attrs.resource.feature_image;
    }
};

module.exports.post = post;
module.exports.tag = tag;
module.exports.author = author;
module.exports.action = action;
