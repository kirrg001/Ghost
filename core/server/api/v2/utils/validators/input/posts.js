const _ = require('lodash');
const common = require('../../../../../lib/common/index');

module.exports = {
    add(options) {
        /**
         * Ensure correct incoming `post.authors` structure.
         *
         * NOTE:
         * The `post.authors[*].id` attribute is required till we release Ghost 3.0.
         * Ghost 1.x keeps the deprecated support for `post.author_id`, which is the primary author id and needs to be
         * updated if the order of the `post.authors` array changes.
         * If we allow adding authors via the post endpoint e.g. `authors=[{name: 'newuser']` (no id property), it's hard
             * to update the primary author id (`post.author_id`), because the new author `id` is generated when attaching
             * the author to the post. And the attach operation happens in bookshelf-relations, which happens after
             * the event handling in the post model.
             *
             * It's solvable, but not worth right now solving, because the admin UI does not support this feature.
             *
             * TLDR; You can only attach existing authors to a post.
             *
         * @TODO: remove `id` restriction in Ghost 3.0
         */
        if (options.data.posts[0].hasOwnProperty('authors')) {
            if (!_.isArray(options.data.posts[0].authors) ||
                (options.data.posts[0].authors.length && _.filter(options.data.posts[0].authors, 'id').length !== options.data.posts[0].authors.length)) {
                throw new common.errors.BadRequestError({
                    message: common.i18n.t('errors.api.utils.invalidStructure', {key: 'posts[*].authors'})
                });
            }
        }
    },

    edit(options) {
        this.add(options);

        if (options.modelOptions.id && options.data[docName][0].id && options.modelOptions.id !== options.data[docName][0].id) {
            throw new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.utils.invalidIdProvided')
            });
        }
    }
};
