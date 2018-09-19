module.exports = {
    add: {
        statusCode: 201,
        response: {
            format: 'plain'
        },
        headers: {
            disposition: {
                type: 'csv',
                value: 'Attachment; filename="redirects.json'
            },
            cacheInvalidate: true
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        call(object, options) {
            /**
             * return models.Post.edit()
             *   .then((posts) => {
             *       if (model.updated('status') !== model.get('status')) {
             *           this.headers.cacheInvalidate = true;
             *       }
             *   });
             *
             */

            console.log(object, options);
        }
    }
};
