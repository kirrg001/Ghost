var config = require('../../config'),
    events = require(config.paths.corePath + '/server/events'),
    models = require(config.paths.corePath + '/server/models'),
    Promise = require('bluebird'),
    moment = require('moment-timezone');


/**
 * WHEN timezone changes, we will:
 * - reschedule all scheduled posts
 */
events.on('settings:activeTimezone:edited', function (settingModel) {
    var timezoneOffset = moment.tz(settingModel.get('activeTimezone')).utcOffset();

    // CASE: TZ was updated, but did not change
    if (!settingModel.hasPropertyChanged('activeTimezone')) {
        return;
    }

    models.Post.findAll({filter: 'status:scheduled', context: {internal: true}})
        .then(function (results) {
            if (!results.length) {
                return;
            }

            return Promise.all(results.forEach(function (post) {
                var newPublishedAtMoment = moment(post.get('published_at')).add(timezoneOffset, 'minutes');

                /**
                 * CASE:
                 *   - your configured TZ is GMT+01:00
                 *   - now is 10AM
                 *   - your post will be published 12AM
                 *   - you reconfigure your TZ to GMT-02:00
                 */
                if (newPublishedAtMoment.isBefore(moment().add(5, 'minutes'))) {
                    post.set('status', 'draft');
                } else {
                    post.set('published_at', newPublishedAtMoment.toDate());
                }

                return models.Post.edit(post.toJSON(), {id: post.id}).reflect();
            })).then(function (results) {
                results.forEach(function (result) {
                    console.log(result.get('status'), result.previous('published_at'), result.get('published_at'));
                });
            });
        })
        .catch(function (err) {
            console.log(err);
        });
});
