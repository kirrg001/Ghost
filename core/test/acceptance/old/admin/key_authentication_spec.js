const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const testUtils = require('../../../utils');
const localUtils = require('./utils');

const config = require('../../../../server/config');
const models = require('../../../../server/models');

const ghost = testUtils.startGhost;

// TODO: remove this suite once Admin API key auth is enabled
describe('Admin API V2 key authentication', function () {
    let request;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('api_keys', 'integrations');
            });
    });

    it('browse with correct GET endpoint token', function () {
        return request.get(localUtils.API.getApiQuery('posts/'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken(localUtils.API.getApiQuery('posts/'))}`)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403);
    });

    it.only('lol', function () {
        const url = localUtils.API.getApiQuery(`actions/resource/${testUtils.DataGenerator.Content.posts[0].id}/`);
        let postId;

        return request
            .get(url)
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken(url)}`)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;

                console.log('existing post with actions', jsonResponse);

                return models.Post.add({
                    title: 'lol',
                    author_id: testUtils.DataGenerator.Content.users[0].id,
                    status: 'published'
                }, {context: {integration: testUtils.DataGenerator.Content.integrations[0].id}});
            })
            .then((newpost) => {
                postId = newpost.id;

                const url = localUtils.API.getApiQuery(`actions/resource/${postId}/`);

                return request
                    .get(url)
                    .set('Origin', testUtils.API.getURL())
                    .set('Authorization', `Ghost ${localUtils.getValidAdminToken(url)}`)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                const jsonResponse = res.body;

                jsonResponse.actions.forEach((action) => {
                    console.log('actor', action.actor);
                    console.log('resource', action.resource);
                    console.log('context', action.context);
                    console.log('event', action.event);
                    console.log('####');
                });

                return models.Post.edit({
                    title: 'hehehhe'
                }, {
                    context: {integration: testUtils.DataGenerator.Content.integrations[0].id},
                    id: postId
                });
            })
            .then((newpost) => {
                return models.Post.edit({
                    title: 'huhuhuhu'
                }, {
                    context: {user: '1'},
                    id: postId
                });
            })
            .then((newpost) => {
                return models.Action.findPage({filter: `resource_id:${postId}`});
            })
            .then((actions) => {
                actions.data.forEach((model) => {
                    // console.log(model.toJSON());
                });

                const url = localUtils.API.getApiQuery(`actions/resource/${postId}/`);

                return request
                    .get(url)
                    .set('Origin', testUtils.API.getURL())
                    .set('Authorization', `Ghost ${localUtils.getValidAdminToken(url)}`)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                const jsonResponse = res.body;

                jsonResponse.actions.forEach((action) => {
                    console.log(action.actor_id);
                    console.log(action.resource_id);
                    console.log('actor', action.actor);
                    console.log('resource', action.resource);
                    console.log('context', action.context);
                    console.log('event', action.event);
                    console.log('####');
                });

                const url = localUtils.API.getApiQuery(`actions/actor/${jsonResponse.actions[0].actor_id}/`);

                return request
                    .get(url)
                    .set('Origin', testUtils.API.getURL())
                    .set('Authorization', `Ghost ${localUtils.getValidAdminToken(url)}`)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                const jsonResponse = res.body;

                jsonResponse.actions.forEach((action) => {
                    console.log(action.actor_id);
                    console.log(action.resource_id);
                    console.log('actor', action.actor);
                    console.log('resource', action.resource);
                    console.log('context', action.context);
                    console.log('event', action.event);
                    console.log('####');
                });
            });
    });
});

// TODO: enable this suite once Admin API key auth is enabled
describe.skip('Admin API V2 key authentication', function () {
    let request;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('api_keys');
            });
    });

    it('do not authenticate without token header', function () {
        return request.get(localUtils.API.getApiQuery('posts/'))
            .set('Authorization', `Ghost`)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401);
    });

    it('do not authenticate with wrong endpoint token', function () {
        return request.get(localUtils.API.getApiQuery('posts/'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('https://wrong.com')}`)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401);
    });

    it('browse with no endpoint token', function () {
        return request.get(localUtils.API.getApiQuery('posts/'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('')}`)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401);
    });

    it('browse with correct GET endpoint token', function () {
        return request.get(localUtils.API.getApiQuery('posts/'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken(localUtils.API.getApiQuery('posts/'))}`)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);
    });

    it('browse with correct POST endpoint token', function () {
        const post = {
            // @TODO: required for now, needs proper validation
            author_id: '1',
            title: 'Post created with api_key'
        };

        return request
            .post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken(localUtils.API.getApiQuery('posts'))}`)
            .send({
                posts: [post]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);
    });
});
