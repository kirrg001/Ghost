const fs = require('fs-extra');
const Promise = require('bluebird');
const path = require('path');

module.exports = () => {
    const fkill = require('fkill');
    let pid;

    try {
        pid = parseInt(fs.readFileSync(path.join(__dirname, 'ghost.pid')));
    } catch (e) {
        if (e.code === 'ENOENT') {
            // pid was not found, exit
            return Promise.resolve();
        }

        return Promise.reject(new Error('An unexpected error occurred when reading the pidfile.'));
    }

    return fkill(pid, {force: true});
};
