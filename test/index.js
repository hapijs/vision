'use strict';

// Load modules

const Path = require('path');

const Code = require('code');
const Handlebars = require('handlebars');
const Hapi = require('hapi');
const Pug = require('pug');
const Lab = require('lab');
const Vision = require('..');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;


describe('handler()', () => {

    it('handles routes to views', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/{param}', handler: { view: 'valid/handler' } });
        const res = await server.inject({ method: 'GET', url: '/hello' });
        expect(res.result).to.contain('hello');
    });

    it('handles custom context', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { pug: Pug },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/index', context: { message: 'heyloo' } } } });
        const res = await server.inject('/');
        expect(res.result).to.contain('heyloo');
    });

    it('handles custom options', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates',
            layoutPath: __dirname + '/templates/layout'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/options', options: { layout: 'elsewhere' } } } });
        const res = await server.inject('/');
        expect(res.result).to.contain('+hello');
    });

    it('includes prerequisites in the default view context', async () => {

        const pre = function (request, h) {

            return 'PreHello';
        };

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates'
        });

        server.route({
            method: 'GET',
            path: '/',
            config: {
                pre: [
                    { method: pre, assign: 'p' }
                ],
                handler: {
                    view: 'valid/handler'
                }
            }
        });

        const res = await server.inject('/');
        expect(res.result).to.contain('PreHello');
    });

    it('handles both custom and default contexts', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext', context: { message: 'heyloo' } } } });
        const res = await server.inject('/?test=yes');
        expect(res.result).to.contain('heyloo');
        expect(res.result).to.contain('yes');
    });

    it('overrides default contexts when provided with context of same name', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext', context: { message: 'heyloo', query: { test: 'no' } } } } });
        const res = await server.inject('/?test=yes');
        expect(res.result).to.contain('heyloo');
        expect(res.result).to.contain('no');
    });

    it('handles a global context object', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates',
            context: {
                message: 'default message'
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext' } } });
        const res = await server.inject('/');
        expect(res.result).to.contain('<h1></h1>');
        expect(res.result).to.contain('<h1>default message</h1>');
    });

    it('passes the request to a global context function', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates',

            context: (request) => {

                return {
                    message: request ? request.route.path : 'default'
                };
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext' } } });
        const res = await server.inject('/');
        expect(res.result).to.contain('<h1></h1>');
        expect(res.result).to.contain('<h1>/</h1>');
    });

    it('overrides the global context with the default handler context', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates',

            context: {
                message: 'default message',
                query: {
                    test: 'global'
                }
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext' } } });
        const res = await server.inject('/?test=yes');
        expect(res.result).to.contain('<h1>yes</h1>');
        expect(res.result).to.contain('<h1>default message</h1>');
    });

    it('overrides the global and default contexts with a custom handler context', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates',

            context: {
                message: 'default message',

                query: {
                    test: 'global'
                }
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext', context: { message: 'override', query: { test: 'no' } } } } });
        const res = await server.inject('/?test=yes');
        expect(res.result).to.contain('<h1>no</h1>');
        expect(res.result).to.contain('<h1>override</h1>');
    });

    it('throws on missing views', async () => {

        const server = Hapi.server({ debug: false });
        await server.register(Vision);
        server.route({
            path: '/',
            method: 'GET',
            handler: function (request, h) {

                return h.view('test', { message: 'steve' });
            }
        });

        const res = await server.inject('/');
        expect(res.statusCode).to.equal(500);
    });
});

describe('render()', () => {

    it('renders view (root)', async () => {

        const server = Hapi.server();
        await server.register(Vision);

        server.views({
            engines: { html: Handlebars },
            path: __dirname + '/templates/valid'
        });

        const rendered = await server.render('test', { title: 'test', message: 'Hapi' });
        expect(rendered).to.contain('Hapi');
    });

    it('renders view (root with options)', async () => {

        const server = Hapi.server();
        await server.register(Vision);

        server.views({
            engines: { html: Handlebars }
        });

        const rendered = await server.render('test', { title: 'test', message: 'Hapi' }, { path: Path.join(__dirname, '/templates/valid') });
        expect(rendered).to.contain('Hapi');
    });

    it('renders view (plugin)', async () => {

        const test = {
            name: 'test',

            register: async function (server, options) {

                server.views({
                    engines: { 'html': Handlebars },
                    relativeTo: Path.join(__dirname, '/templates/plugin')
                });

                const rendered = await server.render('test', { message: 'steve' });
                server.route({ path: '/view', method: 'GET', handler: () => rendered });
            }
        };

        const server = Hapi.server();
        await server.register(Vision);

        await server.register(test);
        const res = await server.inject('/view');
        expect(res.result).to.equal('<h1>steve</h1>');
    });

    it('renders view (plugin without views)', async () => {

        const test = {
            name: 'test',

            register: async function (server, options) {

                const rendered = await server.render('test', { message: 'steve' });
                server.route({ path: '/view', method: 'GET', handler: () => rendered });
            }
        };

        const server = Hapi.server();
        await server.register(Vision);

        server.views({
            engines: { 'html': Handlebars },
            relativeTo: Path.join(__dirname, '/templates/plugin')
        });

        await server.register(test);
        const res = await server.inject('/view');
        expect(res.result).to.equal('<h1>steve</h1>');
    });

    it('renders view (plugin with options)', async () => {

        const test = {
            name: 'test',

            register: async function (server, options) {

                server.views({
                    engines: { 'html': Handlebars }
                });

                const rendered = await server.render('test', { message: 'steve' }, { relativeTo: Path.join(__dirname, '/templates/plugin') });
                server.route({ path: '/view', method: 'GET', handler: () => rendered });
            }
        };

        const server = Hapi.server();
        await server.register(Vision);

        await server.register(test);
        const res = await server.inject('/view');

        expect(res.result).to.equal('<h1>steve</h1>');
    });

    it('rejects on missing views', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        await expect(server.render('test')).to.reject('Missing views manager');
    });

    it('renders view (plugin request)', async () => {

        const test = {
            name: 'test',

            register: function (server, options) {

                server.views({
                    engines: { 'html': Handlebars },
                    relativeTo: Path.join(__dirname, '/templates/plugin')
                });

                server.route({
                    method: 'GET',
                    path: '/view',
                    handler: (request) => request.render('test', { message: 'steve' })
                });
            }
        };

        const server = Hapi.server();
        await server.register(Vision);
        await server.register(test);
        const res = await server.inject('/view');
        expect(res.result).to.equal('<h1>steve</h1>');
    });

    it('does not pass the request to the global context function (server)', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates/valid',

            context: (request) => {

                return {
                    message: request ? request.route.path : 'default'
                };
            }
        });

        const rendered = await server.render('testContext', null, null);
        expect(rendered).to.contain('<h1>default</h1>');
    });

    it('does not pass the request to the global context function (request)', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates/valid',

            context: (request) => {

                return {
                    message: request ? request.route.path : 'default'
                };
            }
        });

        server.route({ method: 'GET', path: '/', handler: (request) => request.render('testContext', null, null) });
        const res = await server.inject({ method: 'GET', url: '/' });
        expect(res.result).to.contain('<h1>default</h1>');
    });

    it('errors on missing manager', async () => {

        const test = {
            name: 'test',

            register: async function (server, options) {

                await server.render('test', { message: 'steve' });
            }
        };

        const server = Hapi.server();
        await server.register(Vision);
        await expect(server.register(test)).to.reject('Missing views manager');
    });
});

describe('views()', () => {

    it('requires plugin with views', async () => {

        const test = {
            name: 'test',

            register: function (server, options) {

                server.path(__dirname);

                const views = {
                    engines: { 'html': Handlebars },
                    path: './templates/plugin'
                };

                server.views(views);

                if (Object.keys(views).length !== 2) {
                    throw new Error('plugin.view() modified options');
                }

                server.route({ path: '/view', method: 'GET', handler: (request, h) => h.view('test', { message: options.message }) });
                server.ext('onRequest', (request, h) => {

                    if (request.path === '/ext') {
                        return h.view('test', { message: 'grabbed' }).takeover();
                    }

                    return h.continue;
                });
            }
        };

        const server = Hapi.server();
        await server.register(Vision);
        await server.register({ plugin: test, options: { message: 'viewing it' } });

        const res1 = await server.inject('/view');
        expect(res1.result).to.equal('<h1>viewing it</h1>');

        const res2 = await server.inject('/ext');
        expect(res2.result).to.equal('<h1>grabbed</h1>');
    });

    it('requires plugin with views with specific relativeTo', async () => {

        const test = {
            name: 'test',

            register: function (server, options) {

                server.views({
                    engines: { 'html': Handlebars },
                    relativeTo: Path.join(__dirname, '/templates/plugin')
                });

                server.route({ path: '/view', method: 'GET', handler: (request, h) => h.view('test', { message: 'steve' }) });
            }
        };

        const server = Hapi.server();
        await server.register(Vision);
        await server.register(test);

        const res = await server.inject('/view');
        expect(res.result).to.equal('<h1>steve</h1>');
    });

    it('defaults to server views', async () => {

        const test = {
            name: 'test',

            register: function (server, options) {

                server.route({
                    path: '/view',
                    method: 'GET',
                    handler: (request, h) => h.view('test', { message: options.message })
                });
            }
        };

        const server = Hapi.server();
        await server.register(Vision);

        server.path(__dirname);

        const views = {
            engines: { 'html': Handlebars },
            path: './templates/plugin'
        };

        server.views(views);

        await server.register({ plugin: test, options: { message: 'viewing it' } });
        const res = await server.inject('/view');
        expect(res.result).to.equal('<h1>viewing it</h1>');
    });

    it('throws on multiple views', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({ engines: { 'html': Handlebars } });
        expect(() => {

            server.views({ engines: { 'html': Handlebars } });
        }).to.throw('Cannot set views manager more than once');
    });

    it('can register helpers via the view manager', async () => {

        const server = Hapi.server();
        await server.register(Vision);

        const manager = server.views({
            engines: { 'html': Handlebars.create() },
            relativeTo: 'test/templates',
            path: 'valid'
        });

        manager.registerHelper('long', (string) => string);
        manager.registerHelper('uppercase', (string) => string);

        const rendered = await server.render('testHelpers', { something: 'uppercase' });
        expect(rendered).to.equal('<p>This is all uppercase and this is how we like it!</p>');
    });

    it('can render templates via the view manager', async () => {

        const server = Hapi.server();
        await server.register(Vision);

        const manager = server.views({
            engines: { 'html': Handlebars },
            relativeTo: 'test/templates',
            path: 'valid'
        });

        const rendered = await manager.render('test', { message: 'Hello!' }, null);
        expect(rendered).to.contain('<h1>Hello!</h1>');
    });
});

describe('Plugin', () => {

    it('only registers once', async () => {

        const one = {
            name: 'one',

            register: function (server, options) {

                return server.register(Vision);
            }
        };

        const two = {
            name: 'two',

            register: function (server, options) {

                return server.register(Vision);
            }
        };

        const server = Hapi.server();
        await server.register([one, two]);
    });
});
