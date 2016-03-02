'use strict';

// Load modules

const Code = require('code');
const Lab = require('lab');
const University = require('../lib');
const Users = require('../lib/users.json');
const Auth = require('../lib/cookie-auth');
const AuthDev = require('../lib/resources');
const Hoek = require('hoek');
const Path = require('path');
const Config = require('../lib/config');
const GenerateSession = require('./generateSession');
const Async = require('async');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.experiment;
const expect = Code.expect;
const it = lab.test;


describe('/cookie-auth', () => {

    it('cookie-auth server.app.cache.get coverage.', { parallel: false }, (done) => {

        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const request = {
                url: '/login',
                method: 'POST',
                payload: {
                    username: 'foo',
                    password: 'foo'
                }
            };

            GenerateSession(server, 'web-tls', request, (err, sessionCookie) => {

                expect(err).to.not.exist();
                expect(sessionCookie.length).to.equal(228);

                const original = server.app.cache;

                server.app.cache.get = (id, callback) => {

                    server.app.cache = original;
                    return callback('mock cache.set failure.', null);
                };

                const request2 = {
                    method: 'GET',
                    url: '/restricted',
                    headers: { 'cookie': 'sid-example=' + sessionCookie }
                };

                server.select('web-tls').inject(request2, (res) => {

                    expect(res.statusCode).to.equal(302);
                    return server.stop(done);

                    server.stop(done);
                });
            });
        });
    });

    it('server.app.cache fail time out.', { parallel: false }, (done) => {

        // monkey path session expiration length.
        // make the session time out after 200 milliseconds.

        internals.original = Auth.options;
        Auth.options.cacheOptions = { segment: 'sessions', expiresIn: 200 };

        University.init(internals.manifest, internals.composeOptions, (err, server) => {

            expect(err).to.not.exist();

            const loginRequest = {
                url: '/login',
                method: 'POST',
                payload: {
                    username: 'foo',
                    password: Users.foo.password
                }
            };


            GenerateSession(server, 'web-tls', loginRequest, (err, sessionCookie) => {

                expect(err).to.not.exist();
                expect(sessionCookie.length).to.equal(228);

                internals.sessionCookie = sessionCookie;

                Async.series([(callback) => {

                    setTimeout(() => {

                        // delay 500 to create time out.
                        return callback();
                    }, 500);
                }, (callback) => {

                    const request = {
                        method: 'GET',
                        url: '/restricted',
                        headers: { cookie: 'sid-example=' +  internals.sessionCookie }
                    };

                    server.select('web-tls').inject(request, (res) => {

                        expect(res.statusCode).to.equal(302);
                        callback();
                    });
                }], (err, results) => {

                    Auth.options = internals.original;
                    expect(err).to.not.exist();
                    server.stop(done);
                });
            });
        });
    });

    it('errors on failed registering of cookie-auth', { parallel: false }, (done) => {

        const orig = Auth.register;

        Auth.register = (plugin, options, next) => {

            Auth.register = orig;
            return next(new Error('fail'));
        };

        Auth.register.attributes = {
            name: 'fake Auth'
        };

        University.init(internals.manifest, internals.composeOptions, (err) => {

            expect(err).to.exist();

            done();
        });
    });

    it('errors on missing Auth plugin', (done) => {

        const manifest = Hoek.clone(internals.manifest);
        manifest.registrations.splice(1,1);

        University.init(manifest, internals.composeOptions, (err, server) => {

            expect(err).to.exist();
            expect(err.message).to.equal('Plugin ' + AuthDev.register.attributes.name + ' missing dependency ' + Auth.register.attributes.name +
                                         ' in connection: ' + server.select('web-tls').info.uri);

            done();
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
