'use strict';

// Load modules

const Code = require('code');
const Lab = require('lab');
const University = require('../lib');
const Path = require('path');
const Config = require('../lib/config');
const GenerateSession = require('./generateSession');

// Declare internals

const internals = {};

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.experiment;
const expect = Code.expect;
const it = lab.test;


describe('/resources', () => {

    it('ensures /auth works', (done) => {

        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const webTls = server.select('web-tls');

            const request = {
                method: 'GET',
                url: '/auth'
            };
            webTls.inject(request, (res) => {

                expect(res.statusCode, 'Status code').to.equal(200);

                server.stop(done);
            });
        });
    });

    it('ensures /auth redirects', (done) => {

        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const web = server.select('web');
            const webTls = server.select('web-tls');

            const request = {
                method: 'GET',
                url: '/auth'
            };
            web.inject(request, (res) => {

                expect(res.statusCode, 'Status code').to.equal(301);
                expect(res.headers.location).to.equal(webTls.info.uri + '/auth');

                return server.stop(done);
            });
        });
    });

    it('success /login authenticate a user', (done) => {

        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const webTls = server.select('web-tls');

            const request = {
                method: 'POST',
                url: '/login',
                payload: {
                    username: 'foo',
                    password: 'foo'
                }
            };

            webTls.inject(request, (res) => {

                const cookies = res.headers['set-cookie'];

                internals.cookie = cookies[0].match(/(?:[^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)\s*=\s*(?:([^\x00-\x20\"\,\;\\\x7F]*))/);

                expect(cookies[0].includes('sid-example')).to.equal(true);
                expect(res.statusCode, 'Status code').to.equal(302);
                expect(res.headers.location).to.equal('/home');

                return server.stop(done);
            });
        });
    });

    it('fail /login user d/n exist', (done) => {

        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const webTls = server.select('web-tls');

            const request = {
                method: 'POST',
                url: '/login',
                payload: {
                    username: 'foop',
                    password: 'foo'
                }
            };

            webTls.inject(request, (res) => {

                expect(res.statusCode, 'Status code').to.equal(401);
                expect(res.result.message, 'message').to.equal('Invalid username or password');
                expect(res.headers['content-type'], 'content-type').to.equal('application/json; charset=utf-8');

                server.stop(done);
            });
        });
    });

    it('fail /login user missing username', (done) => {

        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const webTls = server.select('web-tls');

            const request = {
                method: 'POST',
                url: '/login',
                payload: {
                    password: 'foo'
                }
            };

            webTls.inject(request, (res) => {

                expect(res.statusCode, 'Status code').to.equal(401);
                expect(res.result.message, 'message').to.equal('Missing username or password');
                expect(res.headers['content-type'], 'content-type').to.equal('application/json; charset=utf-8');

                return server.stop(done);
            });
        });
    });

    it('success previously authenticated user redirected to home.', (done) => {

        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const options = {
                url: '/login',
                method: 'POST',
                payload: {
                    username: 'foo',
                    password: 'foo'
                }
            };

            GenerateSession(server, 'web-tls', options, (err, sessionCookie) => {

                expect(err).to.not.exist();
                expect(sessionCookie.length).to.equal(228);

                const options2 = {
                    url: '/login',
                    method: 'POST',
                    payload: {
                        username: 'foo',
                        password: 'foo'
                    },
                    headers: { 'cookie': 'sid-example=' + sessionCookie }
                };

                server.select('web-tls').inject(options2, (res) => {

                    expect(res.statusCode).to.equal(302);
                    return server.stop(done);
                });
            });
        });
    });

    it('fail server.app.cache error on login.', { parallel: false }, (done) => {


        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const original = server.app.cache;

            server.app.cache = {};
            server.app.cache.set = (one, two, three, callback) => {

                server.app.cache = original;
                return callback('mock cache.set failure');
            };

            const options = {
                url: '/login',
                method: 'POST',
                payload: {
                    username: 'foo',
                    password: 'foo'
                }
            };

            server.select('web-tls').inject(options, (res) => {

                expect(res.result).to.equal('mock cache.set failure');
                expect(res.statusCode).to.equal(200);
                return server.stop(done);
            });
        });
    });

    it('success /restricted.', (done) => {

        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const loginRequest = {
                url: '/login',
                method: 'POST',
                payload: {
                    username: 'foo',
                    password: 'foo'
                }
            };


            GenerateSession(server, 'web-tls', loginRequest, (err, sessionCookie) => {

                expect(err).to.not.exist();
                expect(sessionCookie.length).to.equal(228);

                internals.sessionCookie = sessionCookie;

                const request = {
                    method: 'GET',
                    url: '/restricted',
                    headers: { cookie: 'sid-example=' +  sessionCookie }
                };

                server.select('web-tls').inject(request, (res) => {

                    expect(res.statusCode).to.equal(200);
                    server.stop(done);
                });
            });
        });
    });
});


internals.manifest = {
    connections: [
        {
            host: 'localhost',
            port: 0,
            labels: ['web']
        },
        {
            host: 'localhost',
            port: 0,
            labels: ['web-tls'],
            tls: Config.tls
        }
    ],
    registrations: [
        {
            plugin: './resources',
            options: {
                select: ['web-tls']
            }
        },
        {
            plugin: './cookie-auth',
            options: {
                select: ['web-tls']
            }
        },
        {
            plugin: 'hapi-auth-cookie'
        }
    ]
};

internals.composeOptions = {
    relativeTo: Path.resolve(__dirname, '../lib')
};
