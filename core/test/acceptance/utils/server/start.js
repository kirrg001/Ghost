const fs = require('fs-extra');
const portFinder = require('portfinder');
const childProcess = require('child_process');
const Promise = require('bluebird');
const path = require('path');

module.exports = () => {
    let config;
    let insertData = false;

    const db_path = path.join(__dirname, '..', 'content', 'data', 'ghost-test.db');

    if (process.env['REGENERATE_DB']) {
        fs.removeSync(db_path);
        insertData = true;
    }

    if (!fs.existsSync(db_path)) {
        insertData = true;
    }

    return new Promise((resolve, reject) => {
        return portFinder.getPortPromise()
            .then((port) => {
                config = {
                    url: `http://127.0.0.1:${port}`,
                    server__host: '127.0.0.1',
                    server__port: port,
                    database__connection__filename: db_path,
                    paths__contentPath: path.join(__dirname, '..', 'content')
                };

                const child = childProcess.spawn(process.execPath, ['index.js'], {
                    cwd: '.',
                    stdio: [0, 1, 2, 'ipc'],
                    env: Object.assign(config, process.env)
                });

                fs.writeFileSync(path.join(__dirname, 'ghost.pid'), child.pid);

                let failed = false;

                child.on('error', (error) => {
                    if (failed) {
                        return;
                    }

                    failed = true;
                    reject(new Error(error.message));
                });

                child.on('message', (message) => {
                    if (message.started) {
                        return resolve({
                            process: child,
                            config: config
                        });
                    }

                    if (failed) {
                        return;
                    }

                    failed = true;

                    const err = new Error(message.error.message);
                    err.help = message.error.help;
                    err.type = message.error.errorType;
                    err.code = message.error.code;
                    err.statusCode = message.error.statusCode;

                    reject(err);
                });
            });
    }).then((options) => {
        const supertest = require('supertest');
        options.request = supertest.agent(options.config.url);
        options.api_version = 'v2';

        return new Promise((resolve) => {
            (function retry() {
                let timeout;

                if (timeout) {
                    clearTimeout(timeout);
                }

                options.request
                    .get('/')
                    .then((res) => {
                        if (res.statusCode === 200) {
                            resolve();
                        }

                        timeout = setTimeout(retry, 50);
                    });
            })();
        }).return(options);
    }).then((options) => {
        if (insertData) {
            const insert = require('./db/insert');
            return insert(config).return(options);
        }

        return options;
    });
};
