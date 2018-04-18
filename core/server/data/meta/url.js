var schema = require('../schema').checks,
    urlService = require('../../services/url');

// This cleans the url from any `/amp` postfixes, so we'll never
// output a url with `/amp` in the end, except for the needed `amphtml`
// canonical link, which is rendered by `getAmpUrl`.
function sanitizeAmpUrl(url) {
    if (url.indexOf('/amp/') !== -1) {
        url = url.replace(/\/amp\/$/i, '/');
    }
    return url;
}

// @TODO: why data.post vs data?
function getUrl(data, absolute) {
    if (schema.isPost(data.post || data)) {
        return urlService.getUrlByResourceId(data.post ? data.post.id : data.id, {secure: data.secure, absolute: absolute});
    }

    if (schema.isTag(data.tag || data)) {
        return urlService.getUrlByResourceId(data.tag ? data.tag.id : data.id, {secure: data.secure, absolute: absolute});
    }

    if (schema.isUser(data.author || data)) {
        return urlService.getUrlByResourceId(data.author ? data.author.id : data.id, {secure: data.secure, absolute});
    }

    if (schema.isNav(data)) {
        return urlService.utils.urlFor('nav', {nav: data, secure: data.secure}, absolute);
    }

    // CASE: does not look like a resource
    // @TODO: what is the real case here? O_O
    // sanitize any trailing `/amp` in the url
    return sanitizeAmpUrl(urlService.utils.urlFor(data, {}, absolute));
}

module.exports = getUrl;
