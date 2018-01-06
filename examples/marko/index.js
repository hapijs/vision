'use strict';
// Load modules

const Hapi = require('hapi');
const Vision = require('../..');
const Marko = require('marko');
const Path = require('path');

require('marko/node-require');

// Declare internals

const internals = {
    templatePath: '.'
};

const today = new Date();
internals.thisYear = today.getFullYear();


const rootHandler = (request, h) => {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    return h.view('index', {
        title: `Running ${relativePath} | Hapi ${request.server.version}`,
        message: 'Hello Marko!',
        year: internals.thisYear
    });
};

internals.main = async () => {

    const server = Hapi.server({
        port: 3000
    });

    await server.register(Vision);

    server.views({
        relativeTo: __dirname,
        engines: {
            marko: {
                compile: (src, options) => {

                    const opts = {
                        preserveWhitespace: true,
                        writeToDisk: false
                    };

                    const template = Marko.load(options.filename, opts);

                    return (context) => {

                        return template.renderToString(context);
                    };
                }
            }
        },
        path: `templates/${internals.templatePath}`
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: rootHandler
    });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};

internals.main();
