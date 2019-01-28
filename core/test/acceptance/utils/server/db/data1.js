const moment = require('moment-timezone');
const _ = require('lodash');

const data = {
    Tag: [
        {

            name: 'kitchen sink',
            slug: 'kitchen-sink',
            feature_image: 'https://example.com/super_photo.jpg'
        },
        {

            name: 'bacon',
            slug: 'bacon'
        },
        {

            name: 'chorizo',
            slug: 'chorizo'
        },
        {

            name: 'pollo',
            slug: 'pollo'
        },
        {

            name: 'injection',
            slug: 'injection'
        }
    ],

    // Password = Sl1m3rson99
    User: [
        {
            // owner (owner is still id 1 because of permissions)
            id: '1',
            name: 'Joe Bloggs',
            slug: 'joe-bloggs',
            email: 'jbloggs@example.com',
            password: 'Sl1m3rson99',
            profile_image: 'https://example.com/super_photo.jpg',
            roles: ['Owner']
        },
        {
            // admin

            name: 'Smith Wellingsworth',
            slug: 'smith-wellingsworth',
            email: 'swellingsworth@example.com',
            password: 'Sl1m3rson99',
            roles: ['Administrator']
        },
        {
            // editor

            name: 'Jimothy Bogendath',
            slug: 'jimothy-bogendath',
            email: 'jbOgendAth@example.com',
            password: 'Sl1m3rson99',
            roles: ['Editor']
        },
        {
            // author

            name: 'Slimer McEctoplasm',
            slug: 'slimer-mcectoplasm',
            email: 'smcectoplasm@example.com',
            password: 'Sl1m3rson99',
            roles: ['Author']
        },
        {
            // editor 2

            name: 'Ivan Email',
            slug: 'ivan-email',
            email: 'info1@ghost.org',
            password: 'Sl1m3rson99',
            roles: ['Editor']
        },
        {
            // author 2

            name: 'Author2',
            slug: 'a-2',
            email: 'info2@ghost.org',
            password: 'Sl1m3rson99',
            roles: ['Author']
        },
        {
            // admin 2

            name: 'admin2',
            slug: 'ad-2',
            email: 'info3@ghost.org',
            password: 'Sl1m3rson99',
            roles: ['Administrator']
        },
        {
            // contributor

            name: 'Contributor',
            slug: 'contributor',
            email: 'contributor@ghost.org',
            password: 'Sl1m3rson99',
            roles: ['Contributor']
        },
        {
            // contributor

            name: 'contributor2',
            slug: 'contrib-2',
            email: 'contributor2@ghost.org',
            password: 'Sl1m3rson99',
            roles: ['Contributor']
        }
    ],

    Post: [
        {
            title: 'HTML Ipsum',
            slug: 'html-ipsum',
            mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"<h1>HTML Ipsum Presents</h1><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href=\\"#\\">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a{display: block;width: 300px;height: 80px;}</code></pre>"}]],"sections":[[10,0]]}',
            published_at: new Date('2015-01-01'),
            custom_excerpt: 'This is my custom excerpt!',
            feature_image: 'https://example.com/super_photo.jpg',
            status: 'published',
            tags: [
                {
                    slug: 'kitchen-sink'
                },
                {
                    slug: 'bacon'
                }
            ],
            authors: [
                {
                    slug: 'joe-bloggs'
                }
            ]
        },
        {

            title: 'Ghostly Kitchen Sink',
            slug: 'ghostly-kitchen-sink',
            mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"<h1>HTML Ipsum Presents</h1><img src=\\"/content/images/lol.jpg\\"><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href=\\"#\\">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a{display: block;width: 300px;height: 80px;}</code></pre>"}]],"sections":[[10,0]]}',
            published_at: new Date('2015-01-02'),
            feature_image: '/content/images/2018/hey.jpg',
            status: 'published',
            tags: [
                {
                    slug: 'kitchen-sink'
                },
                {
                    slug: 'bacon'
                }
            ],
            authors: [
                {
                    slug: 'joe-bloggs'
                }
            ]
        },
        {

            title: 'Short and Sweet',
            slug: 'short-and-sweet',
            mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"## testing\\n\\nmctesters\\n\\n- test\\n- line\\n- items"}]],"sections":[[10,0]]}',
            plaintext: 'testing\nmctesters\n\n * test\n * line\n * items',
            feature_image: 'http://placekitten.com/500/200',
            meta_description: 'test stuff',
            published_at: new Date('2015-01-03'),
            featured: true,
            status: 'published',
            uuid: '2ac6b4f6-e1f3-406c-9247-c94a0496d39d',
            tags: [
                {
                    slug: 'chorizo'
                }
            ],
            authors: [
                {
                    slug: 'joe-bloggs'
                }
            ]
        },
        {

            title: 'Not finished yet',
            slug: 'unfinished',
            mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"<h1>HTML Ipsum Presents</h1><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href=\\"#\\">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a{display: block;width: 300px;height: 80px;}</code></pre>"}]],"sections":[[10,0]]}',
            status: 'draft',
            uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c903',
            tags: [
                {
                    slug: 'pollo'
                }
            ],
            authors: [
                {
                    slug: 'joe-bloggs'
                },
                {
                    slug: 'jimothy-bogendath'
                }
            ]
        },
        {

            title: 'Not so short, bit complex',
            slug: 'not-so-short-bit-complex',
            mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"<p><nav><ul><li><a href=\\"#nowhere\\" title=\\"Anchor URL\\">Lorem</a></li><li><a href=\\"/about#nowhere\\" title=\\"Relative URL\\">Aliquam</a></li><li><a href=\\"//somewhere.com/link#nowhere\\" title=\\"Protocol Relative URL\\">Tortor</a></li><li><a href=\\"http://somewhere.com/link#nowhere\\" title=\\"Absolute URL\\">Morbi</a></li><li><a href=\\"#nowhere\\" title=\\"Praesent dapibus, neque id cursus faucibus\\">Praesent</a></li><li><a href=\\"#nowhere\\" title=\\"Pellentesque fermentum dolor\\">Pellentesque</a></li></ul></nav><p>Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.</p><table><thead><tr><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead><tbody><tr><td>a</td><td>b</td><td>c</td><td>d</td></tr><tr><td>e</td><td>f</td><td>g</td><td>h</td></tr><tr><td>i</td><td>j</td><td>k</td><td>l</td></tr></tbody></table><dl><dt>Definition list</dt><dd>Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</dd><dt>Lorem ipsum dolor sit amet</dt><dd>Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</dd></dl><ul><li>Morbi in sem quis dui placerat ornare. Pellentesque odio nisi, euismod in, pharetra a, ultricies in, diam. Sed arcu. Cras consequat.</li><li>Praesent dapibus, neque id cursus faucibus, tortor neque egestas augue, eu vulputate magna eros eu erat. Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus.</li><li>Phasellus ultrices nulla quis nibh. Quisque a lectus. Donec consectetuer ligula vulputate sem tristique cursus. Nam nulla quam, gravida non, commodo a, sodales sit amet, nisi.</li><li>Pellentesque fermentum dolor. Aliquam quam lectus, facilisis auctor, ultrices ut, elementum vulputate, nunc.</li></ul></p>"}]],"sections":[[10,0]]}',
            featured: true,
            status: 'published',
            authors: [
                {
                    slug: 'joe-bloggs'
                },
                {
                    slug: 'slimer-mcectoplasm'
                }
            ]
        },
        {

            title: 'This is a static page',
            slug: 'static-page-test',
            mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"<h1>Static page test is what this is for.</h1><p>Hopefully you don\'t find it a bore.</p>"}]],"sections":[[10,0]]}',
            page: true,
            status: 'published',
            authors: [
                {
                    slug: 'joe-bloggs'
                }
            ]
        },
        {

            title: 'This is a draft static page',
            slug: 'static-page-draft',
            mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"<h1>Static page test is what this is for.</h1><p>Hopefully you don\'t find it a bore.</p>"}]],"sections":[[10,0]]}',
            page: true,
            status: 'draft',
            authors: [
                {
                    slug: 'joe-bloggs'
                }
            ]
        },
        {

            title: 'This is a scheduled post!!',
            slug: 'scheduled-post',
            mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"cardName":"markdown","markdown":"<h1>Welcome to my invisible post!</h1>"}]],"sections":[[10,0]]}',
            status: 'scheduled',
            published_at: moment().add(2, 'days').toDate(),
            authors: [
                {
                    slug: 'joe-bloggs'
                }
            ]
        }
    ],

    Integration: [
        {

            name: 'Test Integration',
            slug: 'test-integration'
        }
    ],

    ApiKey: [
        {

            id: '5c4f7d5b75b56c8bf73d0440',
            type: 'admin',
            secret: _.repeat('a', 64)
        },
        {

            type: 'content',
            secret: _.repeat('c', 26)
        },
        {

            type: 'admin',
            integration_id: undefined // "internal"
        }
    ]
};

module.exports = data;
