// # Pagination
//
// Extends Bookshelf.Model with a `fetchPage` method. Handles everything to do with paginated requests.
var _ = require('lodash'),
    common = require('../../lib/common');

/**
 * select `posts`.* from `posts` where `posts`.`status` = ? and `posts`.`page` = ? order by CASE WHEN posts.status = 'scheduled' THEN 1 WHEN posts.status = 'draft' THEN 2 ELSE 3 END ASC,posts.published_at DESC,posts.updated_at DESC,posts.id DESC limit ?
 * select count(distinct posts.id) as aggregate from `posts` where `posts`.`status` = ? and `posts`.`page` = ?
 * select `tags`.*, `posts_tags`.`post_id` as `_pivot_post_id`, `posts_tags`.`tag_id` as `_pivot_tag_id`, `posts_tags`.`sort_order` as `_pivot_sort_order` from `tags` inner join `posts_tags` on `posts_tags`.`tag_id` = `tags`.`id` where `posts_tags`.`post_id` in ("5a9545d54b64744c5a86c241", "5a9545d54b64744c5a86c242", "5a9545d54b64744c5a86c243", "5a9545d54b64744c5a86c244", "5a9545d54b64744c5a86c245", "5a9545d54b64744c5a86c246", "5a9545d54b64744c5a86c247") order by `sort_order` ASC
 *
 * @TODO: order
 * @TODO: fetch related
 * @TODO: filter parsing
 */
module.exports = function plain(bookshelf) {
    _.extend(bookshelf.Model.prototype, {
        fetchPage: function fetchPage(options) {
            const tableName = this.constructor.prototype.tableName,
                idAttribute = this.constructor.prototype.idAttribute,
                self = this;

            const limit = options.hasOwnProperty('limit') ? options.limit : 10,
                page = options.hasOwnProperty('page') ? options.page : 1,
                offset = limit * (page - 1);

            let calcPages;
            let totalItems;
            let where = '';
            let collection;

            if (tableName === 'posts') {
                if (options.status) {
                    if (options.status === 'all') {
                        where += ' WHERE status IN ("published", "scheduled", "draft")';
                    } else {
                        where += ' WHERE status = "' + options.status + '"';
                    }
                }
            }

            return bookshelf.knex.raw('SELECT count(distinct ' + tableName + '.' + idAttribute + ') as aggregate from `' + tableName + '`' + where)
                .then(function (countResult) {
                    totalItems = countResult[0][0] ? countResult[0][0].aggregate : 0;
                    let query = 'SELECT id, html, author_id, title, slug, feature_image, featured, page, status, visibility, meta_title, meta_description, created_at, created_by, custom_excerpt, codeinjection_head, codeinjection_foot, og_image, og_title, og_description, twitter_image, twitter_title, twitter_description, custom_template FROM `' + tableName + '`' + where;

                    query += ' order by status ASC, published_at DESC, updated_by DESC, id DESC';

                    if (limit !== 'all') {
                        query += ' LIMIT ' + limit + ' OFFSET ' + offset;
                    }

                    return bookshelf.knex.raw(query);
                })
                .then(function (result) {
                    collection = self.constructor.collection(result[0]);

                    if (options.withRelated && options.withRelated.indexOf('tags') !== -1 && collection.models.length) {
                        const ids = _.map(collection.models, function (o) {
                            return '"' + _.pick(o, 'id').id + '"';
                        });

                        return bookshelf.knex.raw('SELECT tags.id, tags.slug, posts_tags.post_id FROM `tags` inner join `posts_tags` on `posts_tags`.`tag_id` = `tags`.`id` where `posts_tags`.`post_id` in (' + ids + ') order by `sort_order` ASC');
                    }
                })
                .then(function (relations) {
                    if (relations) {
                        _.each(relations[0], function (relation) {
                            let tags = collection.find({id: relation.post_id}).related('tags');
                            tags.add(relation);
                        });
                    }

                    calcPages = Math.ceil(totalItems / limit) || 0;

                    return {
                        collection: collection,
                        pagination: {
                            page: page,
                            limit: limit,
                            pages: calcPages === 0 ? 1 : calcPages,
                            total: totalItems,
                            next: null,
                            prev: null
                        }
                    };
                });
        }
    });
};
