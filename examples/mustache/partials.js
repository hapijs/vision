'use strict';

const Path = require('path');

const Hapi = require('@hapi/hapi');
const Mustache = require('mustache');
const Vision = require('../..');


const internals = {
    templatePath: 'withPartials',
    thisYear: new Date().getFullYear()
};


internals.rootHandler = function (request, h) {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    return h.view('index', {
        title: `Running ${relativePath} | hapi ${request.server.version}`,
        message: 'Hello Mustache Partials!',
        year: internals.thisYear
    });
};


internals.main = async function () {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    const partials = {};

    server.views({
        engines: {
            html: {
                compile: function (template) {

                    Mustache.parse(template);

                    return function (context) {

                        return Mustache.render(template, context, partials);
                    };
                },

                registerPartial: function (name, src) {

                    partials[name] = src;
                }
            }
        },
        relativeTo: __dirname,
        path: `templates/${internals.templatePath}`,
        partialsPath: `templates/${internals.templatePath}/partials`
    });

    server.route({ method: 'GET', path: '/', handler: internals.rootHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};

internals.main();
