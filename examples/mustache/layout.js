'use strict';
// Load modules

const Hapi = require('hapi');
const Vision = require('../..');
const Path = require('path');
const Mustache = require('mustache');


// Declare internals

const internals = {
    templatePath: 'withLayout'
};

const today = new Date();
internals.thisYear = today.getFullYear();


const rootHandler = (request, h) => {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    return h.view('index', {
        title: `Running ${relativePath} | Hapi ${request.server.version}`,
        message: 'Hello Mustache Layout!',
        year: internals.thisYear
    });
};


internals.main = async () => {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    server.views({
        engines: {
            html: {
                compile: function (template) {

                    Mustache.parse(template);

                    return function (context) {

                        return Mustache.render(template, context);
                    };
                }
            }
        },
        relativeTo: __dirname,
        path: `templates/${internals.templatePath}`,
        layout: true
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};


internals.main();
