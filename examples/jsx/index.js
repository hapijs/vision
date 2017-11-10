'use strict';
// Load modules

const Hapi = require('hapi');
const Vision = require('../..');
const Path = require('path');
const HapiReactViews = require('hapi-react-views');

require('babel-core/register')({
    plugins: ['transform-react-jsx']
});


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
        message: 'Hello Jsx!',
        year: internals.thisYear
    });
};


const aboutHandler = (request, h) => {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    return h.view('about', {
        title: `Running ${relativePath} | Hapi ${request.server.version}`,
        message: 'Jsx About Page',
        year: internals.thisYear
    });
};


internals.main = async () => {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    server.views({
        engines: { jsx: HapiReactViews },
        relativeTo: __dirname,
        path: `templates/${internals.templatePath}`
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });
    server.route({ method: 'GET', path: '/about', handler: aboutHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};


internals.main();
