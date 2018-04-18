var urlService = require('../../services/url');

function getAuthorUrl(data, absolute) {
    var context = data.context ? data.context[0] : null;

    context = context === 'amp' ? 'post' : context;

    if (data.author) {
        return urlService.getUrlByResourceId(data.author.id, {absolute: absolute});
    }

    // @TODO: secure flag? O_O
    if (data[context] && data[context].primary_author) {
        return urlService.getUrlByResourceId(data[context].primary_author.id, {absolute: absolute});
    }

    return null;
}

module.exports = getAuthorUrl;
