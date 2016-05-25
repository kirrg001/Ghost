var config = require('../../config'),
    events = require(config.paths.corePath + '/server/events'),
    models = require(config.paths.corePath + '/server/models'),
    errors = require(config.paths.corePath + '/server/errors'),
    Promise = require('bluebird'),
    moment = require('moment-timezone');

/**
 * WHEN timezone changes, we will:
 * - reschedule all scheduled posts
 * - draft scheduled posts, when the published_at would be in the past
 */
events.on('settings.activeTimezone.edited', function (settingModel) {
    var newTimezone = settingModel.attributes.value,
        previousTimezone = settingModel._updatedAttributes.value,
        timezoneOffset = moment.tz(newTimezone).utcOffset();

    // CASE: TZ was updated, but did not change
    if (previousTimezone === newTimezone) {
        return;
    }

    models.Post.findAll({filter: 'status:scheduled', context: {internal: true}})
        .then(function (results) {
            if (!results.length) {
                return;
            }

            return Promise.all(results.map(function (post) {
                console.log('modify', post.get('published_at'), timezoneOffset);
                var newPublishedAtMoment = moment(post.get('published_at')).add(timezoneOffset, 'minutes');

                /**
                 * CASE:
                 *   - your configured TZ is GMT+01:00
                 *   - now is 10AM +01:00 (9AM UTC)
                 *   - your post should be published 8PM +01:00 (7PM UTC)
                 *   - you reconfigure your blog TZ to GMT+08:00
                 *   - now is 5PM +08:00 (9AM UTC)
                 *   - if we don't change the published_at, 7PM + 8 hours === next day 5AM
                 *   - so we update published_at to 7PM - 480minutes === 11AM UTC
                 *   - 11AM UTC === 7PM +08:00
                 */
                if (newPublishedAtMoment.isBefore(moment().add(5, 'minutes'))) {
                    post.set('status', 'draft');
                } else {
                    post.set('published_at', newPublishedAtMoment.toDate());
                }

                return models.Post.edit(post.toJSON(), {id: post.id, context: {internal: true}}).reflect();
            })).each(function (result) {
                if (!result.isFulfilled()) {
                    errors.logError(result.reason());
                }
            });
        })
        .catch(function (err) {
            errors.logError(err);
        });
});
