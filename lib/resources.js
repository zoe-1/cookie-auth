'use strict';

const Users = require('./users.json');
const Hoek = require('hoek');
const Boom = require('boom');


// Declare internals

const internals = {};

internals.getUser = (payload, callback) => {


    let account = null;

    account = Users[payload.username];

    // joi should prevent this error but not added yet.
    if (!payload.username ||
        !payload.password) {

        return callback('Missing username or password', null);
    }

    account = Users[payload.username];

    if (!account ||
        account.password !== payload.password) {

        return callback('Invalid username or password', null);
    }

    // Remove sensitive data from user cookie info

    const accountCopy = Hoek.clone(account);
    delete accountCopy.password;

    return callback(null, accountCopy);
};

exports.register = (server, options, next) => {

    // Code inside the callback function of server.dependency will only be executed
    // after Auth plugin has been registered. It's triggered by server.start,
    // and runs before actual starting of the server.  It's done because the call to
    // server.route upon registration with auth:'basic' config would fail and make
    // the server crash if the basic strategy is not previously registered by Auth.
    server.dependency('AuthCookie', internals.after);

    return next();
};

exports.register.attributes = {
    name: 'Resources'
};


internals.after = (server, next) => {

    server.route({
        method: 'GET',
        path: '/auth',
        config: {
            auth: { strategy: 'session', mode: 'try' },
            plugins: { 'hapi-auth-cookie': { redirectTo: false } },
            description: 'Returns message to user regardless if authenticated or not.',
            handler: (request, reply) => {

                const html = '<div>Hello auth-dev working</div>';
                return reply(html);
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/restricted',
        config: {
            auth: { strategy: 'session', mode: 'try' },
            plugins: { 'hapi-auth-cookie': { redirectTo: true } },
            description: 'Returns message to authenticated users.',
            handler: (request, reply) => {

                const html = '<div>You accessed restricted data.</div>';
                return reply(html);
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/login',
        config: {
            auth: { strategy: 'session', mode: 'try' },
            plugins: { 'hapi-auth-cookie': { redirectTo: false } },
            description: 'Authenticates user credentials.',
            handler: (request, reply) => {

                if (request.auth.isAuthenticated) {
                    return reply.redirect('/home');
                }

                internals.getUser(request.payload, (err, user) => {

                    if (err) {
                        return reply(Boom.unauthorized(err)); // "oh, no!"
                    }

                    const userAccount = Hoek.clone(user);
                    const sid = String(userAccount.id);
                    delete userAccount.password;

                    request.server.app.cache.set(sid, { account: userAccount }, 0, (err) => {

                        if (err) {
                            return reply(err);
                        }

                        request.cookieAuth.set({ sid: sid });
                        return reply.redirect('/home');
                    });
                });
            }
        }
    });

    return next();
};
