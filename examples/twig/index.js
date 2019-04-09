'use strict';

const Path = require('path');

const Hapi = require('@hapi/hapi');
const Twig = require('twig');
const Vision = require('../..');


const internals = {
    templatePath: '.',
    thisYear: new Date().getFullYear()
};


internals.rootHandler = function (request, h) {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    return h.view('index', {
        title: `Running ${relativePath} | hapi ${request.server.version}`,
        message: 'Hello Twig!',
        year: internals.thisYear
    });
};


internals.main = async function () {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    server.views({
        engines: {
            twig: {
                compile: (src, options) => {

                    const template = Twig.twig({ id: options.filename, data: src });

                    return (context) => {

                        return template.render(context);
                    };
                }
            }
        },
        relativeTo: __dirname,
        path: `templates/${internals.templatePath}`
    });

    server.route({ method: 'GET', path: '/', handler: internals.rootHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};

internals.main();
