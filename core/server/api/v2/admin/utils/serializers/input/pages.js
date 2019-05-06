const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:pages');
const converters = require('../../../../../lib/mobiledoc/converters');
const url = require('./utils/url');

function defaultRelations(frame) {
    if (frame.options.withRelated) {
        return;
    }

    if (frame.options.columns && !frame.options.withRelated) {
        return false;
    }

    frame.options.withRelated = ['tags', 'authors', 'authors.roles'];
}

function defaultFormat(frame) {
    if (frame.options.formats) {
        return;
    }

    frame.options.formats = 'mobiledoc';
}

/**
 * CASE:
 *
 * - the content api endpoints for pages forces the model layer to return static pages only
 * - we have to enforce the filter
 *
 * @TODO: https://github.com/TryGhost/Ghost/issues/10268
 */
const forcePageFilter = (frame) => {
    if (frame.options.filter) {
        frame.options.filter = `(${frame.options.filter})+page:true`;
    } else {
        frame.options.filter = 'page:true';
    }
};

const forceStatusFilter = (frame) => {
    if (!frame.options.filter) {
        frame.options.filter = 'status:[draft,published,scheduled]';
    } else if (!frame.options.filter.match(/status:/)) {
        frame.options.filter = `(${frame.options.filter})+status:[draft,published,scheduled]`;
    }
};

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        forcePageFilter(frame);

        forceStatusFilter(frame);
        defaultFormat(frame);
        defaultRelations(frame);

        debug(frame.options);
    },

    read(apiConfig, frame) {
        debug('read');

        forcePageFilter(frame);

        forceStatusFilter(frame);
        defaultFormat(frame);
        defaultRelations(frame);

        debug(frame.options);
    },

    add(apiConfig, frame, options = {add: true}) {
        debug('add');

        if (_.get(frame,'options.source')) {
            const html = frame.data.pages[0].html;

            if (frame.options.source === 'html' && !_.isEmpty(html)) {
                frame.data.pages[0].mobiledoc = JSON.stringify(converters.htmlToMobiledocConverter(html));
            }
        }

        frame.data.pages[0] = url.forPost(Object.assign({}, frame.data.pages[0]), frame.options);

        // @NOTE: force storing page
        if (options.add) {
            frame.data.pages[0].page = true;
        }

        // CASE: Transform short to long format
        if (frame.data.pages[0].authors) {
            frame.data.pages[0].authors.forEach((author, index) => {
                if (_.isString(author)) {
                    frame.data.pages[0].authors[index] = {
                        email: author
                    };
                }
            });
        }

        if (frame.data.pages[0].tags) {
            frame.data.pages[0].tags.forEach((tag, index) => {
                if (_.isString(tag)) {
                    frame.data.pages[0].tags[index] = {
                        name: tag
                    };
                }
            });
        }

        defaultFormat(frame);
        defaultRelations(frame);
    },

    edit(apiConfig, frame) {
        this.add(...arguments, {add: false});

        debug('edit');

        forceStatusFilter(frame);
        forcePageFilter(frame);
    },

    destroy(apiConfig, frame) {
        frame.options.destroyBy = {
            id: frame.options.id,
            page: true
        };

        defaultFormat(frame);
        defaultRelations(frame);
    }
};
