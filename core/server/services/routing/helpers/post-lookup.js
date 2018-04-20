'use strict';

const _ = require('lodash'),
    Promise = require('bluebird'),
    url = require('url'),
    routeMatch = require('path-match')(),
    api = require('../../../api');

function postLookup(postUrl, routingType) {
    const targetPath = url.parse(postUrl).path,
        permalinks = routingType.permalinks;

    let isEditURL = false;

    // Convert saved permalink into a path-match function
    const matchFunc = routeMatch(permalinks);
    const params = matchFunc(targetPath);

    // if there are no matches for either then return empty
    // params can be empty e.g. permalink is /featured/:options(edit)?/ and path is /featured/
    if (params === false || !Object.keys(params).length) {
        return Promise.resolve();
    }

    // If params contains options, and it is equal to 'edit', this is an edit URL
    if (params.options && params.options.toLowerCase() === 'edit') {
        isEditURL = true;
    }

    /**
     * Query database to find post.
     *
     * @deprecated: `author`, will be removed in Ghost 2.0
     */
    return api.posts.read(_.extend(_.pick(params, 'slug', 'id'), {include: 'author,authors,tags'}))
        .then(function then(result) {
            const post = result.posts[0];

            if (!post) {
                return Promise.resolve();
            }

            return {
                post: post,
                isEditURL: isEditURL,
                isUnknownOption: isEditURL ? false : !!params.options
            };
        });
}

module.exports = postLookup;
