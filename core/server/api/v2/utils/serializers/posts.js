module.exports = {
    input(options) {
        /**
         * Convert author property to author_id to match the name in the database.
         *
         * @deprecated: `author`, might be removed in Ghost 3.0
         */
        if (options.data.posts[0].hasOwnProperty('author')) {
            options.data.posts[0].author_id = options.data.posts[0].author;
            delete options.data.posts[0].author;
        }

        /**
         * CASE: we don't support updating nested-nested relations e.g. `post.authors[*].roles` yet.
         *
         * Bookshelf-relations supports this feature, BUT bookshelf's `hasChanged` fn will currently
         * clash with this, because `hasChanged` won't be able to tell if relations have changed or not.
         * It would always return `changed.roles = [....]`. It would always throw a model event that relations
         * were updated, which is not true.
         *
         * Bookshelf-relations can tell us if a relation has changed, it knows that.
         * But the connection between our model layer, Bookshelf's `hasChanged` fn and Bookshelf-relations
         * is not present. As long as we don't support this case, we have to ignore this.
         */
        if (options.data.posts[0].authors && options.data.posts[0].authors.length) {
            _.each(options.data.posts[0].authors, (author, index) => {
                if (author.hasOwnProperty('roles')) {
                    delete options.data.posts[0].authors[index].roles;
                }

                if (author.hasOwnProperty('permissions')) {
                    delete options.data.posts[0].authors[index].permissions;
                }
            });
        }

        /**
         * Model notation is: `tag.parent_id`.
         * The API notation is `tag.parent`.
         */
        if (options.data.posts[0].hasOwnProperty('tags')) {
            if (_.isArray(options.data.posts[0].tags) && options.data.posts[0].tags.length) {
                _.each(options.data.posts[0].tags, (tag, index) => {
                    if (tag.hasOwnProperty('parent')) {
                        options.data.posts[0].tags[index].parent_id = tag.parent;
                        delete options.data.posts[0].tags[index].parent;
                    }

                    if (tag.hasOwnProperty('posts')) {
                        delete options.data.posts[0].tags[index].posts;
                    }
                });
            }
        }

        if (options.modelOptions.context.public) {
            options.modelOptions.filter = 'page:false';
        }
    }
};
