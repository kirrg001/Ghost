const _ = require('lodash');

module.exports.v2 = {
    content: {
        author: {
            out: {
                fields: [
                    'id',
                    'name',
                    'slug',
                    'profile_image',
                    'cover_image',
                    'bio',
                    'website',
                    'location',
                    'facebook',
                    'twitter',
                    'meta_title',
                    'meta_description',
                    'url'
                ]
            }
        }
    },

    admin: {
        post: {
            out: {
                fields: []
            },

            in: {
                create() {
                    return {
                        title: 'title',
                        slug: 'slug',
                        authors: [
                            {
                                name: 'neu'
                            }
                        ]
                    };
                }
            }
        }
    }
};
