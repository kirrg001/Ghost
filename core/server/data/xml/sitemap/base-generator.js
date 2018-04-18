'use strict';

const _ = require('lodash'),
    xml = require('xml'),
    moment = require('moment'),
    path = require('path'),
    urlService = require('../../../services/url'),
    localUtils = require('./utils'),
    CHANGE_FREQ = 'weekly';

// Sitemap specific xml namespace declarations that should not change
const XMLNS_DECLS = {
    _attr: {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
        'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1'
    }
};

function BaseSiteMapGenerator() {
    this.nodeLookup = {};
    this.nodeTimeLookup = {};
    this.siteMapContent = '';
}

_.extend(BaseSiteMapGenerator.prototype, {
    generateXmlFromNodes: function () {
        var self = this,
            // Get a mapping of node to timestamp
            timedNodes = _.map(this.nodeLookup, function (node, id) {
                return {
                    id: id,
                    // Using negative here to sort newest to oldest
                    ts: -(self.nodeTimeLookup[id] || 0),
                    node: node
                };
            }, []),
            // Sort nodes by timestamp
            sortedNodes = _.sortBy(timedNodes, 'ts'),
            // Grab just the nodes
            urlElements = _.map(sortedNodes, 'node'),
            data = {
                // Concat the elements to the _attr declaration
                urlset: [XMLNS_DECLS].concat(urlElements)
            };

        // Return the xml
        return localUtils.getDeclarations() + xml(data);
    },

    updateXmlFromNodes: function (urlElements) {
        var content = this.generateXmlFromNodes(urlElements);

        this.setSiteMapContent(content);

        return content;
    },

    addOrUpdateUrl: function (url, datum) {
        const node = this.createUrlNodeFromDatum(url, datum);

        if (node) {
            this.updateLookups(datum, node);
            this.updateXmlFromNodes();
        }
    },

    removeUrl: function (url, datum) {
        this.removeFromLookups(datum);
        this.updateXmlFromNodes();
    },

    getUrlForImage: function (image) {
        return urlService.utils.urlFor('image', {image: image}, true);
    },

    getPriorityForDatum: function () {
        return 1.0;
    },

    getLastModifiedForDatum: function (datum) {
        return datum.updated_at || datum.published_at || datum.created_at;
    },

    createUrlNodeFromDatum: function (url, datum) {
        const priority = this.getPriorityForDatum(datum);
        let node, imgNode;

        node = {
            url: [
                {loc: url},
                {lastmod: moment(this.getLastModifiedForDatum(datum)).toISOString()},
                {changefreq: CHANGE_FREQ},
                {priority: priority}
            ]
        };

        imgNode = this.createImageNodeFromDatum(datum);

        if (imgNode) {
            node.url.push(imgNode);
        }

        return node;
    },

    createImageNodeFromDatum: function (datum) {
        // Check for cover first because user has cover but the rest only have image
        var image = datum.cover_image || datum.profile_image || datum.feature_image,
            imageUrl,
            imageEl;

        if (!image) {
            return;
        }

        // Grab the image url
        imageUrl = this.getUrlForImage(image);

        // Verify the url structure
        if (!this.validateImageUrl(imageUrl)) {
            return;
        }

        // Create the weird xml node syntax structure that is expected
        imageEl = [
            {'image:loc': imageUrl},
            {'image:caption': path.basename(imageUrl)}
        ];

        // Return the node to be added to the url xml node
        return {
            'image:image': imageEl
        };
    },

    validateImageUrl: function (imageUrl) {
        return !!imageUrl;
    },

    setSiteMapContent: function (content) {
        this.siteMapContent = content;
    },

    // @TODO: Check if the node values changed, and if not don't regenerate
    updateLookups: function (datum, node) {
        this.nodeLookup[datum.id] = node;
        this.nodeTimeLookup[datum.id] = this.getLastModifiedForDatum(datum);
    },

    removeFromLookups: function (datum) {
        var lookup = this.nodeLookup;
        delete lookup[datum.id];

        lookup = this.nodeTimeLookup;
        delete lookup[datum.id];
    }
});

module.exports = BaseSiteMapGenerator;
