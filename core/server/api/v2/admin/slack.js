const common = require('../../../lib/common/index');

module.exports = {
    docName: 'slack',
    sendTest: {
        permissions: false,
        query() {
            common.events.emit('slack.test');
        }
    }
};
