'use strict';

/**
 * # Fetch Data
 * Dynamically build and execute queries on the API
 */
const _ = require('lodash'),
    routeMatch = require('path-match')(),
    Promise = require('bluebird'),
    urlService = require('../../url'),
    api = require('../../../api'),
    defaultPostQuery = {};

// The default settings for a default post query
const queryDefaults = {
    type: 'browse',
    resource: 'posts',
    options: {}
};

/**
 * Default post query needs to always include author, authors & tags
 *
 * @deprecated: `author`, will be removed in Ghost 2.0
 */
_.extend(defaultPostQuery, queryDefaults, {
    options: {
        include: 'author,authors,tags'
    }
});

/**
 * @typedef query
 * @
 */

/**
 * ## Process Query
 * Takes a 'query' object, ensures that type, resource and options are set
 * Replaces occurrences of `%s` in options with slugParam
 * Converts the query config to a promise for the result
 *
 * @param {{type: String, resource: String, options: Object}} query
 * @param {String} slugParam
 * @returns {Promise} promise for an API call
 */
function processQuery(query, slugParam) {
    query = _.cloneDeep(query);

    // Ensure that all the properties are filled out
    _.defaultsDeep(query, queryDefaults);

    // Replace any slugs
    _.each(query.options, function (option, name) {
        query.options[name] = _.isString(option) ? option.replace(/%s/g, slugParam) : option;
    });

    // Return a promise for the api query
    return api[query.resource][query.type](query.options);
}

/**
 * ## Fetch Data
 * Calls out to get posts per page, builds the final posts query & builds any additional queries
 * Wraps the queries using Promise.props to ensure it gets named responses
 * Does a first round of formatting on the response, and returns
 */
function fetchData(pathOptions, routerOptions) {
    let postQuery,
        props = {};

    // All collections must have a posts query, use the default if not provided
    // @TODO: fix this mess
    postQuery = _.defaultsDeep({}, {options: _.omit(pathOptions, 'slug')}, {options: {filter: routerOptions.filter}}, defaultPostQuery);
    props.posts = processQuery(postQuery, pathOptions.slug);

    _.each(routerOptions.data, function (query, name) {
        props[name] = processQuery(query, pathOptions.slug);
    });

    return Promise.props(props)
        .then(function formatResponse(results) {
            const response = _.cloneDeep(results.posts);
            delete results.posts;

            // CASE: does this post belong to this collection?
            // @TODO: problem -> if you fetch posts for a taxonomy, the permalink is a different one ;)
            // @TODO: this is dirty
            if (!routerOptions.data) {
                response.posts = _.filter(response.posts, (post) => {
                    if (urlService.owns(routerOptions.identifier, post.url)) {
                        return post;
                    }
                });
            }

            // process any remaining data
            if (!_.isEmpty(results)) {
                response.data = {};

                _.each(results, function (result, name) {
                    if (routerOptions.data[name].type === 'browse') {
                        response.data[name] = result;
                    } else {
                        response.data[name] = result[routerOptions.data[name].resource];
                    }
                });
            }

            return response;
        });
}

module.exports = fetchData;
