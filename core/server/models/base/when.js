var events = require(__dirname + '/../../events'),
    models = require(__dirname + '/../models'),
    moment = require('moment-timezone');


/**
 * WHEN timezone changes, we will:
 * - reschedule all scheduled posts
 */
events.on('settings:activeTimezone:edited', function (settingModel) {
    // CASE: TZ was updated, but did not change
    if (!settingModel.hasPropertyChanged('activeTimezone')) {
        return;
    }

    models.Post.fetch({status: 'scheduled'})
        .then(function (results) {
            if (!results.length) {
                
            }
        })
        .catch(function (err) {
            console.log(err);
        });
});
