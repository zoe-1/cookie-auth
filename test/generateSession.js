'use strict';

// const GenerateCrumb = require('./generateCrumb');

// ./test/generateSession.js
// // Use to get hapi-auth-cookie session id cookie value inorder to test restricted routes.
// // 1. Generate crumb
// // 2. Generate cookie

module.exports = (server, connectionLabel, injectOptions, callback) => {

    // 2. generate session cookie

    server.select(connectionLabel).inject(injectOptions, (res) => {

        // console.log(JSON.stringify(res.result));

        if (res.result && res.result.error) {
            return callback(res.result, null);
        }

        const headerSplit = res.headers['set-cookie'][0].split('; ');

        const cookieCleaned = headerSplit[0].match(/(?:[^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)\s*=\s*(?:([^\x00-\x20\"\,\;\\\x7F]*))/);

        // console.log('prepared cookie: ' + JSON.stringify(cookieCleaned));
        return callback(null, cookieCleaned[1]);
        // return callback(null, cookieCleaned, crumb);
    });
};
