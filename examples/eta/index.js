'use strict';

const Path = require('path');

const Hapi = require('@hapi/hapi');
const Vision = require('../..');
const Eta = require('eta');


const internals = {
    templatePath: '.',
    thisYear: new Date().getFullYear()
};


internals.rootHandler = function (request, h) {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    return h.view('index', {
        title: `Running ${relativePath} | hapi ${request.server.version}`,
        message: 'Hello Eta!',
        year: internals.thisYear
    });
};


internals.main = async function () {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    server.views({
        engines: {
            eta: {
                compile: (src, options) => {

                    const compiled = Eta.compile(src, options);

                    return (context) => {

                        return Eta.render(compiled, context);
                    };
                }
            }
        },
        /**
         * This is the config object that gets passed to the compile function
         * defined above. This should contain the eta configuration object
         * described at https://eta.js.org/docs/api/configuration Only some of
         * the configuration are relevant when using with hapijs.
         */
        compileOptions: {
            autoEscape: true,
            tags: ['{{', '}}']
        },
        relativeTo: __dirname,
        path: `templates/${internals.templatePath}`
    });

    server.route({ method: 'GET', path: '/', handler: internals.rootHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};

internals.main();
