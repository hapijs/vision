'use strict';
// Load modules

const Path = require('path');
const Hapi = require('hapi');
const PagesClass = require('./pages');
const Vision = require('../..');
const Handlebars = require('handlebars');

const Pages = new PagesClass(`${__dirname}/_pages`);

// Declare internals

const internals = {};

const today = new Date();
internals.thisYear = today.getFullYear();


const getTplArgs = (argsToAppend) => {

    return Object.assign(
        {},
        argsToAppend,
        { year: internals.thisYear }
    );
};


const getViewSimpleHandler = (viewName) => {

    return (request, h) => {

        return h.view(viewName, getTplArgs({
            page: Pages.getPage(request.params.page),
            title: viewName
        }));
    };
};


const getPages = (request, h) => {

    return h.view('index', getTplArgs({
        pages: Object.keys(Pages.getAll()),
        title: 'All pages'
    }));
};


const getPage = (request, h) => {

    return h.view('page', getTplArgs({
        page: Pages.getPage(request.params.page),
        title: request.params.page
    }));
};


const createPage = (request, h) => {

    Pages.savePage(request.payload.name, request.payload.contents);
    return h.view('page', getTplArgs({
        page: Pages.getPage(request.payload.name),
        title: 'Create page'
    }));
};


const showEditForm = (request, h) => {

    return h.view('edit', getTplArgs({
        page: Pages.getPage(request.params.page),
        title: 'Edit: ' + request.params.page
    }));
};


const updatePage = (request, h) => {

    Pages.savePage(request.params.page, request.payload.contents);
    return h.view('page', getTplArgs({
        page: Pages.getPage(request.params.page),
        title: request.params.page
    }));
};


internals.main = async () => {

    const server = Hapi.Server({
        port: 3000,
        state: { ignoreErrors: true }
    });

    await server.register(Vision);

    server.views({
        engines: { html: Handlebars },
        path: Path.join(__dirname, 'views'),
        layout: true,
        partialsPath: Path.join(__dirname, 'views', 'partials')
    });

    server.route({ method: 'GET', path: '/', handler: getPages });
    server.route({ method: 'GET', path: '/pages/{page}', handler: getPage });
    server.route({ method: 'GET', path: '/create', handler: getViewSimpleHandler('create') });
    server.route({ method: 'POST', path: '/create', handler: createPage });
    server.route({ method: 'GET', path: '/pages/{page}/edit', handler: showEditForm });
    server.route({ method: 'POST', path: '/pages/{page}/edit', handler: updatePage });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};


internals.main();
