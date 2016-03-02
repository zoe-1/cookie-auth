'use strict';

module.exports = (server, connectionLabel, injectOptions, callback) => {

    // generate session cookie

    server.select(connectionLabel).inject(injectOptions, (res) => {

        if (res.result && res.result.error) {
            return callback(res.result, null);
        }

        const headerSplit = res.headers['set-cookie'][0].split('; ');

        const cookieCleaned = headerSplit[0].match(/(?:[^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)\s*=\s*(?:([^\x00-\x20\"\,\;\\\x7F]*))/);

        return callback(null, cookieCleaned[1]);
    });
};
