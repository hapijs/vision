'use strict';
// Load modules

const Fs = require('fs');
const Util = require('util');

const Code = require('code');
const Handlebars = require('handlebars');
const Hapi = require('hapi');
const Pug = require('pug');
const Lab = require('lab');
const Vision = require('..');
const Mustache = require('mustache');

const Manager = require('../lib/manager');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;


describe('Manager', () => {

    it('renders handlebars template', async () => {

        const server = Hapi.server();

        await server.register(Vision);

        server.views({
            engines: {
                html: {
                    module: require('handlebars'),
                    path: __dirname + '/templates/valid'
                }
            }
        });

        server.route({ method: 'GET', path: '/handlebars', handler: { view: { template: 'test.html', context: { message: 'Hello World!' } } } });

        const res = await server.inject('/handlebars');
        expect(res.result).to.exist();
        expect(res.statusCode).to.equal(200);
    });

    it('shallow copies global context', () => {

        const options = {
            engines: {
                html: {
                    module: require('handlebars'),
                    path: __dirname + '/templates/valid'
                }
            },
            context: {
                a: 1
            }
        };

        const manager = new Manager(options);
        expect(manager._context).to.equal(options.context);
    });

    it('sets content type', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: {
                html: {
                    module: require('handlebars'),
                    path: __dirname + '/templates/valid',
                    contentType: 'something/else'
                }
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello World!' } } } });
        const res = await server.inject('/');
        expect(res.headers['content-type']).to.equal('something/else');
        expect(res.result).to.exist();
        expect(res.statusCode).to.equal(200);
    });

    it('errors on invalid template path', async () => {

        const server = Hapi.server({ debug: false });
        await server.register(Vision);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/invalid'
        });

        // Rendering errors are not available to extensions.

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello, World!' } } } });
        const res = await server.inject('/');
        expect(res.statusCode).to.equal(500);
    });

    it('returns a compiled Handlebars template reply', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello, World!' } } } });

        const res = await server.inject('/');
        expect(res.result).to.exist();
        expect(res.result).to.have.string('Hello, World!');
        expect(res.statusCode).to.equal(200);
    });

    it('errors absolute path given and allowAbsolutePath is false (by default)', async () => {

        const server = Hapi.server({ debug: false });
        await server.register(Vision);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        // Compilation errors sould be available for extensions.

        let error = null;
        server.ext('onPreResponse', (request, h) => {

            const response = request.response;
            if (response.isBoom) {
                error = response;
            }

            return h.continue;
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: __dirname + '/templates/valid/test', context: { message: 'Hello, World!' } } } });

        const res = await server.inject('/');
        expect(res.result).to.exist();
        expect(res.statusCode).to.equal(500);
        expect(error).to.be.an.instanceof(Error);
    });

    it('errors if path given includes ../ and allowInsecureAccess is false (by default)', async () => {

        const server = Hapi.server({ debug: false });
        await server.register(Vision);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        // Compilation errors sould be available for extensions.

        let error = null;
        server.ext('onPreResponse', (request, h) => {

            const response = request.response;
            if (response.isBoom) {
                error = response;
            }

            return h.continue;
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: '../test', context: { message: 'Hello, World!' } } } });

        const res = await server.inject('/');
        expect(res.result).to.exist();
        expect(res.statusCode).to.equal(500);
        expect(error).to.be.an.instanceof(Error);
    });

    it('allows if path given includes ../ and allowInsecureAccess is true', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { 'html': require('handlebars') },
            allowInsecureAccess: true,
            path: __dirname + '/templates/valid/helpers'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: '../test', context: { message: 'Hello, World!' } } } });

        const res = await server.inject('/');
        expect(res.result).to.exist();
        expect(res.result).to.have.string('Hello, World!');
        expect(res.statusCode).to.equal(200);
    });

    it('errors if template does not exist()', async () => {

        const server = Hapi.server({ debug: false });
        await server.register(Vision);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        // Compilation errors sould be available for extensions.

        let error = null;
        server.ext('onPreResponse', (request, h) => {

            const response = request.response;
            if (response.isBoom) {
                error = response;
            }

            return h.continue;
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'testNope', context: { message: 'Hello, World!' } } } });

        const res = await server.inject('/');
        expect(res.result).to.exist();
        expect(res.statusCode).to.equal(500);
        expect(error).to.be.an.instanceof(Error);
    });

    it('errors if engine.compile throws', async () => {

        const server = Hapi.server({ debug: false });
        await server.register(Vision);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        // Compilation errors sould be available for extensions.

        let error = null;
        server.ext('onPreResponse', (request, h) => {

            const response = request.response;
            if (response.isBoom) {
                error = response;
            }

            return h.continue;
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'badmustache', context: { message: 'Hello, World!' }, options: { path: __dirname + '/templates/valid/invalid' } } } });

        const res = await server.inject('/');
        expect(res.result).to.exist();
        expect(res.statusCode).to.equal(500);
        expect(error).to.be.an.instanceof(Error);
    });

    it('should not fail if rendered template returns undefined', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: {
                html: {
                    module: {
                        compile: function (template, compileOptions) {

                            return function (context, renderOptions) {

                                return undefined;
                            };
                        }
                    },
                    path: __dirname + '/templates/valid'
                }
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test.html' } } });

        const res = await server.inject('/');
        expect(res.statusCode).to.equal(200);
    });

    it('allows the context to be modified by extensions', async () => {

        const server = Hapi.server();
        await server.register(Vision);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        server.ext('onPreResponse', (request, h) => {

            const response = request.response;
            response.source.context.message = 'goodbye';
            return h.continue;
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test.html', context: { message: 'hello' } } } });

        const res = await server.inject('/');
        expect(res.result).to.exist();
        expect(res.result).not.to.contain('hello');
        expect(res.result).to.contain('goodbye');
        expect(res.statusCode).to.equal(200);
    });

    describe('with engine initialization', () => {

        it('modifies the engine options', async () => {

            let compileOptions;
            let runtimeOptions;

            const manager = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compile: function (string, options1) {

                            compileOptions = options1;

                            return function (context, options2) {

                                runtimeOptions = options2;
                                return string;
                            };
                        },

                        prepare: function (options, next) {

                            options.compileOptions = { stage: 'compile' };
                            options.runtimeOptions = { stage: 'render' };
                            return next();
                        }
                    }
                }
            });

            await manager.render('valid/test');
            expect(compileOptions).to.include({ stage: 'compile' });
            expect(runtimeOptions).to.include({ stage: 'render' });
        });

        it('errors if initialization fails', async () => {

            const manager = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compile: function (string, options1) {

                            return function (context, options2) {

                                return string;
                            };
                        },

                        prepare: function (options, next) {

                            return next(new Error('Initialization failed'));
                        }
                    }
                }
            });

            await expect(manager.render('valid/test')).to.reject('Initialization failed');
        });

        it('errors if initialization throws', async () => {

            const manager = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compile: function (string, options1) {

                            return function (context, options2) {

                                return string;
                            };
                        },

                        prepare: function (options, next) {

                            throw new Error('Initialization error');
                        }
                    }
                }
            });

            await expect(manager.render('valid/test')).to.reject('Initialization error');
        });


        it('throws on invalid options', () => {

            expect(() => {

                new Manager({
                    path: __dirname + '/templates',
                    engines: {
                        html: {
                            compile: function (string, options1) {

                                return function (context, options2) {

                                    return string;
                                };
                            },

                            prepare: function (options, next) {

                                throw new Error('Initialization error');
                            }
                        }
                    },
                    badValue: 'badValue'
                });
            })
                .to.throw(/"badValue" is not allowed/);
        });


        it('only initializes once before rendering', async () => {

            let initialized = 0;

            const manager = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compile: function (string, options1) {

                            return function (context, options2) {

                                return string;
                            };
                        },

                        prepare: function (options, next) {

                            ++initialized;
                            return next();
                        }
                    }
                }
            });

            expect(initialized).to.equal(0);
            const rendered1 = await manager.render('valid/test');
            expect(rendered1).to.exist();
            expect(initialized).to.equal(1);

            const rendered2 = await manager.render('valid/test');
            expect(rendered2).to.exist();
            expect(initialized).to.equal(1);
        });

        it('initializes multiple engines independently', async () => {

            let htmlOptions;
            let jadeOptions;

            const manager = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compile: function (string, options1) {

                            htmlOptions = options1;
                            return function (context, options2) {

                                return string;
                            };
                        },

                        prepare: function (options, next) {

                            options.compileOptions = { engine: 'handlebars' };
                            return next();
                        }
                    },

                    pug: {
                        compile: function (string, options1) {

                            jadeOptions = options1;
                            return function (context, options2) {

                                return string;
                            };
                        },

                        prepare: function (options, next) {

                            options.compileOptions = { engine: 'pug' };
                            return next();
                        }
                    }
                }
            });

            const rendered1 = await manager.render('valid/test.html');
            expect(rendered1).to.exist();
            expect(htmlOptions).to.include({ engine: 'handlebars' });
            expect(jadeOptions).to.not.exist();

            const rendered2 = await manager.render('valid/test.pug');
            expect(rendered2).to.exist();
            expect(jadeOptions).to.include({ engine: 'pug' });
        });
    });

    it('should not error on layoutKeyword conflict', async () => {

        const server = Hapi.server({ debug: false });
        await server.register(Vision);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        // Rendering errors are not available to extensions.

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello, World!', content: 'fail' } } } });

        const res = await server.inject('/');
        expect(res.result).to.exist();
        expect(res.statusCode).to.equal(200);
        expect(res.payload).to.contain('Hello, World!');
    });

    describe('with layout', () => {

        it('returns response', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
            expect(res.result.replace(/\r/g, '')).to.equal('<!DOCTYPE html>\n<html>\n    <head>\n        <title>test</title>\n    </head>\n    <body>\n        <div>\n    <h1>Hapi</h1>\n</div>\n\n    </body>\n</html>\n');
        });

        it('returns response with relativeTo and absolute path', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                relativeTo: '/none/shall/pass',
                path: __dirname + '/templates',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
            expect(res.result.replace(/\r/g, '')).to.equal('<!DOCTYPE html>\n<html>\n    <head>\n        <title>test</title>\n    </head>\n    <body>\n        <div>\n    <h1>Hapi</h1>\n</div>\n\n    </body>\n</html>\n');
        });

        it('returns response with layout override', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' }, options: { layout: 'otherLayout' } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
            expect(res.result.replace(/\r/g, '')).to.equal('test:<div>\n    <h1>Hapi</h1>\n</div>\n');
        });

        it('returns response with custom server layout', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: 'otherLayout'
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
            expect(res.result.replace(/\r/g, '')).to.equal('test:<div>\n    <h1>Hapi</h1>\n</div>\n');
        });

        it('returns response with custom server layout and path', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                relativeTo: __dirname,
                path: 'templates',
                layoutPath: 'templates/layout',
                layout: 'elsewhere'
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
            expect(res.result.replace(/\r/g, '')).to.equal('test+<div>\n    <h1>Hapi</h1>\n</div>\n');
        });

        it('errors on missing layout', async () => {

            const server = Hapi.server({ debug: false });
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: 'missingLayout'
            });

            // Compilation errors sould be available for extensions.

            let error = null;
            server.ext('onPreResponse', (request, h) => {

                const response = request.response;
                if (response.isBoom) {
                    error = response;
                }

                return h.continue;
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(500);
            expect(error).to.be.an.instanceof(Error);
        });

        it('errors on invalid layout', async () => {

            const server = Hapi.server({ debug: false });
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: 'invalidLayout'
            });

            // Compilation errors sould be available for extensions.

            let error = null;
            server.ext('onPreResponse', (request, h) => {

                const response = request.response;
                if (response.isBoom) {
                    error = response;
                }

                return h.continue;
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(500);
            expect(error).to.be.an.instanceof(Error);
        });

        it('returns response without layout', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' }, options: { layout: false } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
            expect(res.result.replace(/\r/g, '')).to.equal('<div>\n    <h1>Hapi</h1>\n</div>\n');
        });

        it('errors on layoutKeyword conflict', async () => {

            const server = Hapi.server({ debug: false });
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid',
                layout: true
            });

            // Rendering errors are not available to extensions.

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello, World!', content: 'fail' } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(500);
        });

        it('errors absolute path given and allowAbsolutePath is false (by default)', async () => {

            const server = Hapi.server({ debug: false });
            await server.register(Vision);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid',
                layout: true
            });

            // Compilation errors sould be available for extensions.

            let error = null;
            server.ext('onPreResponse', (request, h) => {

                const response = request.response;
                if (response.isBoom) {
                    error = response;
                }

                return h.continue;
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { title: 'test', message: 'Hapi' }, options: { path: __dirname + '/templates/valid/invalid' } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(500);
            expect(error).to.be.an.instanceof(Error);
        });
    });

    describe('with multiple engines', () => {

        it('renders handlebars template', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                path: __dirname + '/templates/valid',
                engines: {
                    'html': require('handlebars'),
                    'pug': require('pug'),
                    'hbar': {
                        module: {
                            compile: function (engine) {

                                return engine.compile;
                            }
                        }
                    }
                }
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test.html', context: { message: 'Hello World!' } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
        });

        it('renders pug template', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                path: __dirname + '/templates/valid',
                engines: {
                    'html': require('handlebars'),
                    'pug': require('pug'),
                    'hbar': {
                        module: {
                            compile: function (engine) {

                                return engine.compile;
                            }
                        }
                    }
                }
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'testMulti.pug', context: { message: 'Hello World!' } } } });

            const res = await server.inject('/');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
        });

        it('returns 500 on unknown extension', async () => {

            const server = Hapi.server({ debug: false });
            await server.register(Vision);
            server.views({
                path: __dirname + '/templates/valid',
                engines: {
                    'html': require('handlebars'),
                    'pug': require('pug'),
                    'hbar': {
                        module: {
                            compile: function (engine) {

                                return engine.compile;
                            }
                        }
                    }
                }
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello World!' } } } });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(500);
        });

        it('returns 500 on missing extension engine', async () => {

            const server = Hapi.server({ debug: false });
            await server.register(Vision);
            server.views({
                path: __dirname + '/templates/valid',
                engines: {
                    'html': require('handlebars'),
                    'pug': require('pug'),
                    'hbar': {
                        module: {
                            compile: function (engine) {

                                return engine.compile;
                            }
                        }
                    }
                }
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test.xyz', context: { message: 'Hello World!' } } } });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(500);
        });
    });

    describe('render()', () => {

        it('renders with async compile', async () => {

            const views = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compileMode: 'async',
                        module: {
                            compile: function (string, options, callback) {

                                const compiled = Handlebars.compile(string, options);
                                const renderer = function (context, opt, next) {

                                    return next(null, compiled(context, opt));
                                };

                                return callback(null, renderer);
                            }
                        }
                    }
                }
            });

            const rendered = await views.render('valid/test', { title: 'test', message: 'Hapi' });
            expect(rendered).to.exist();
            expect(rendered).to.contain('Hapi');
        });

        it('errors on sync compile that throws', async () => {

            const views = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compileMode: 'sync',
                        module: {
                            compile: function (string, options) {

                                throw (new Error('Bad bad view'));
                            }
                        }
                    }
                }
            });

            await expect(views.render('valid/test', { title: 'test', message: 'Hapi' })).to.reject('Bad bad view');
        });

        it('allows valid (no layouts)', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: false
            });

            const rendered = await testView.render('valid/test', { title: 'test', message: 'Hapi' });
            expect(rendered).to.exist();
            expect(rendered).to.contain('Hapi');
        });

        it('renders without context', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates'
            });

            const rendered = await testView.render('valid/test');
            expect(rendered).to.exist();
            expect(rendered.replace(/\r/g, '')).to.equal('<div>\n    <h1></h1>\n</div>\n');
        });

        it('renders without handler/global-context (with layout)', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            const rendered = await testView.render('valid/test');
            expect(rendered).to.exist();
            expect(rendered.replace(/\r/g, '')).to.contain('<div>\n    <h1></h1>\n</div>\n');
        });

        it('renders with a global context object', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',

                context: {
                    message: 'default message',

                    query: {
                        test: 'global'
                    }
                }
            });

            const rendered = await testView.render('valid/testContext');
            expect(rendered).to.exist();
            expect(rendered).to.contain('<h1>global</h1>');
            expect(rendered.replace(/\r/g, '')).to.contain('<h1>default message</h1>');
        });

        it('overrides the global context object with local values', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',

                context: {
                    message: 'default message',

                    query: {
                        test: 'global'
                    }
                }
            });

            const rendered = await testView.render('valid/testContext', { message: 'override' });
            expect(rendered).to.exist();
            expect(rendered).to.contain('<h1>global</h1>');
            expect(rendered).to.contain('<h1>override</h1>');
        });

        it('renders with a global context function (no request)', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',

                context: function (request) {

                    return {
                        message: request ? request.route.path : 'default message',

                        query: {
                            test: 'global'
                        }
                    };
                }
            });

            const rendered = await testView.render('valid/testContext');
            expect(rendered).to.exist();
            expect(rendered).to.contain('<h1>global</h1>');
            expect(rendered).to.contain('<h1>default message</h1>');
        });

        it('overrides the global context function values with local values', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',

                context: function () {

                    return {
                        message: 'default message',

                        query: {
                            test: 'global'
                        }
                    };
                }
            });

            const rendered = await testView.render('valid/testContext', { message: 'override' });
            expect(rendered).to.exist();
            expect(rendered).to.contain('<h1>global</h1>');
            expect(rendered).to.contain('<h1>override</h1>');
        });

        it('uses specified default ext', async () => {

            const testView = new Manager({
                defaultExtension: 'html',
                engines: { html: require('handlebars'), pug: Pug },
                path: __dirname + '/templates'
            });

            const rendered = await testView.render('valid/test');
            expect(rendered).to.exist();
            expect(rendered.replace(/\r/g, '')).to.equal('<div>\n    <h1></h1>\n</div>\n');
        });

        it('allows relative path with no base', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: './test/templates',
                layout: false
            });

            const rendered = await testView.render('valid/test', { title: 'test', message: 'Hapi' });
            expect(rendered).to.exist();
            expect(rendered.replace(/\r/g, '')).to.equal('<div>\n    <h1>Hapi</h1>\n</div>\n');
        });

        it('allows multiple relative paths with no base', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: ['./test/templates/layout', './test/templates/valid'],
                layout: false
            });

            const rendered = await testView.render('test', { message: 'Hapi' });
            expect(rendered).to.exist();
            expect(rendered).to.contain('<h1>Hapi</h1>');
        });

        it('allows multiple relative paths with a base', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                relativeTo: __dirname + '/templates',
                path: ['layout', 'valid'],
                layout: false
            });

            const rendered = await testView.render('test', { message: 'Hapi' });
            expect(rendered).to.exist();
            expect(rendered.replace(/\r/g, '')).to.contain('<h1>Hapi</h1>');
        });

        it('uses the first matching template', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                relativeTo: __dirname + '/templates',
                path: ['valid', 'invalid'],
                layout: false
            });

            const rendered = await testView.render('test', { message: 'Hapi' });
            expect(rendered).to.exist();
            expect(rendered).to.contain('<h1>Hapi</h1>');
        });

        it('allows multiple absolute paths', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: [__dirname + '/templates/layout', __dirname + '/templates/valid'],
                layout: false
            });

            const rendered = await testView.render('test', { message: 'Hapi' });
            expect(rendered).to.exist();
            expect(rendered).to.contain('<h1>Hapi</h1>');
        });

        it('allows valid (with layouts)', async () => {

            const testViewWithLayouts = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            const rendered = await testViewWithLayouts.render('valid/test', { title: 'test', message: 'Hapi' });
            expect(rendered).to.exist();
            expect(rendered).to.contain('Hapi');
        });

        it('allows absolute path', async () => {

            const testViewWithLayouts = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: __dirname + '/templates/layout',
                allowAbsolutePaths: true
            });

            const rendered = await testViewWithLayouts.render('valid/test', { title: 'test', message: 'Hapi' });
            expect(rendered).to.exist();
            expect(rendered).to.contain('Hapi');
        });

        it('errors on invalid layout', async () => {

            const views = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: 'badlayout'
            });

            await expect(views.render('valid/test', { title: 'test', message: 'Hapi' })).to.reject('Parse error on line 1:\n{{}\n--^\nExpecting \'ID\', \'STRING\', \'NUMBER\', \'BOOLEAN\', \'UNDEFINED\', \'NULL\', \'DATA\', got \'INVALID\': Parse error on line 1:\n{{}\n--^\nExpecting \'ID\', \'STRING\', \'NUMBER\', \'BOOLEAN\', \'UNDEFINED\', \'NULL\', \'DATA\', got \'INVALID\'');
        });

        it('errors on layout compile error', async () => {

            const views = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: 'layout'
            });

            const layout = __dirname + '/templates/layout.html';
            const mode = Fs.statSync(layout).mode;

            Fs.chmodSync(layout, '0300');
            try {
                await expect(views.render('valid/test', { title: 'test', message: 'Hapi' })).to.reject('Failed to read view file: ' + layout);
            }
            finally {
                Fs.chmodSync(layout, mode);
            }
        });

        it('errors on invalid layout path', async () => {

            const views = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: '/badlayout'
            });

            await expect(views.render('valid/test', { title: 'test', message: 'Hapi' })).to.reject('Absolute paths are not allowed in views');
        });

        it('allows multiple layout paths', async () => {

            const views = new Manager({
                engines: { html: require('handlebars') },
                relativeTo: __dirname + '/templates',
                path: 'valid',
                layoutPath: ['invalid', 'layout'],
                layout: 'elsewhere'
            });

            const rendered = await views.render('test', { title: 'test', message: 'Hapi' });
            expect(rendered).to.contain('Hapi');
        });

        it('uses the first matching layout', async () => {

            const views = new Manager({
                engines: { html: require('handlebars') },
                relativeTo: __dirname,
                path: 'templates/valid',
                layoutPath: ['templates', 'templates/invalid'],
                layout: true
            });

            const rendered = await views.render('test', { title: 'test', message: 'Hapi' });
            expect(rendered).to.contain('Hapi');
        });

        it('allows valid pug layouts', async () => {

            const testViewWithJadeLayouts = new Manager({
                engines: { pug: Pug },
                path: __dirname + '/templates' + '/valid/',
                layout: true
            });

            const rendered = await testViewWithJadeLayouts.render('index', { title: 'test', message: 'Hapi' });
            expect(rendered).to.contain('Hapi');
        });

        it('should work and not throw without pug layouts', async () => {

            const testViewWithoutJadeLayouts = new Manager({
                engines: { pug: Pug },
                path: __dirname + '/templates' + '/valid/',
                layout: false
            });

            const rendered = await testViewWithoutJadeLayouts.render('test', { title: 'test', message: 'Hapi Message' });
            expect(rendered).to.contain('Hapi Message');
        });

        it('allows relativeTo, template name, and no path', async () => {

            const views = new Manager({ engines: { html: require('handlebars') } });
            const rendered = await views.render('test', { title: 'test', message: 'Hapi' }, { relativeTo: __dirname + '/templates/valid' });
            expect(rendered).to.contain('Hapi');
        });

        it('errors when referencing non existant partial (with layouts)', async () => {

            const testViewWithLayouts = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            await expect(testViewWithLayouts.render('invalid/test', { title: 'test', message: 'Hapi' })).to.reject();
        });

        it('errors when referencing non existant partial (no layouts)', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: false
            });

            await expect(testView.render('invalid/test', { title: 'test', message: 'Hapi' })).to.reject();
        });

        it('errors if context uses layoutKeyword as a key', async () => {

            const testViewWithLayouts = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            const opts = { title: 'test', message: 'Hapi', content: 1 };
            await expect(testViewWithLayouts.render('valid/test', opts)).to.reject();
        });

        it('errors on compile error (invalid template code)', async () => {

            const testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: false
            });

            await expect(testView.render('invalid/badmustache', { title: 'test', message: 'Hapi' })).to.reject();
        });

        it('loads partials and be able to render them', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials'
            });

            const rendered = await tempView.render('testPartials', {});
            expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
        });

        it('normalizes full partial name (windows)', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials'
            });

            const rendered = await tempView.render('testPartialsName', {});
            expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
        });

        it('loads partials from relative path without base', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: './test/templates/valid/partials'
            });

            const rendered = await tempView.render('testPartials', {});
            expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
        });

        it('loads partals from multiple relative paths without base', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: ['./test/templates/invalid', './test/templates/valid/partials']
            });

            const rendered = await tempView.render('testPartials', {});
            expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
        });

        it('loads partals from multiple relative paths with base', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                relativeTo: __dirname + '/templates',
                path: 'valid',
                partialsPath: ['invalid', 'valid/partials']
            });

            const rendered = await tempView.render('testPartials', {});
            expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
        });

        it('loads partials from multiple absolute paths', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: [__dirname + '/templates/invalid', __dirname + '/templates/valid/partials']
            });

            const rendered = await tempView.render('testPartials', {});
            expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
        });

        it('loads partials from relative path without base (no dot)', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: 'test/templates/valid/partials'
            });

            const rendered = await tempView.render('testPartials', {});
            expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
        });

        it('loads partials and render them EVEN if viewsPath has trailing slash', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials/'
            });

            const rendered = await tempView.render('testPartials', {});
            expect(rendered).to.exist();
            expect(rendered.length).above(1);
        });

        it('skips loading partials and helpers if engine does not support them', async () => {

            const tempView = new Manager({
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials',
                helpersPath: __dirname + '/templates/valid/helpers',
                engines: { html: Pug }
            });

            const rendered = await tempView.render('testPartials', {});
            expect(rendered).to.equal('Nav:{{> nav}}|{{> nested/nav}}');
        });

        it('loads helpers and render them', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                helpersPath: __dirname + '/templates/valid/helpers'
            });

            const rendered = await tempView.render('testHelpers', { something: 'uppercase' });
            expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
        });

        it('loads helpers and render them when helpersPath ends with a slash', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                helpersPath: __dirname + '/templates/valid/helpers/'
            });

            const rendered = await tempView.render('testHelpers', { something: 'uppercase' });
            expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
        });

        it('loads helpers using relative paths', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                relativeTo: './test/templates',
                path: './valid',
                helpersPath: './valid/helpers'
            });

            const rendered = await tempView.render('testHelpers', { something: 'uppercase' });
            expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
        });

        it('loads helpers from multiple paths without a base', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: './test/templates/valid',
                helpersPath: ['./test/templates/valid/helpers/tools', './test/templates/valid/helpers']
            });

            const rendered = await tempView.render('testHelpers', { something: 'uppercase' });
            expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
        });

        it('loads helpers from multiple paths with a base', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                relativeTo: './test/templates',
                path: './valid',
                helpersPath: ['./valid/helpers/tools', './valid/helpers']
            });

            const rendered = await tempView.render('testHelpers', { something: 'uppercase' });
            expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
        });

        it('loads helpers using relative paths (without dots)', async () => {

            const tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                relativeTo: 'test/templates',
                path: 'valid',
                helpersPath: 'valid/helpers'
            });

            const rendered = await tempView.render('testHelpers', { something: 'uppercase' });
            expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
        });

        it('registers helpers programmatically', async () => {

            const tempView = new Manager({
                engines: {
                    html: { module: Handlebars.create() },
                    txt: { module: Handlebars.create() }
                },
                relativeTo: 'test/templates',
                path: 'valid'
            });

            tempView.registerHelper('long', (string) => string + string.substr(-1).repeat(2));
            tempView.registerHelper('uppercase', (string) => string.toUpperCase());

            const rendered1 = await tempView.render('testHelpers.html', { something: 'uppercase' });
            expect(rendered1).to.equal('<p>This is all UPPERCASE and this is howww we like it!</p>');

            const rendered2 = await tempView.render('testHelpers.txt', { something: 'uppercase' });
            expect(rendered2).to.equal('This is all UPPERCASE and this is howww we like it!');
        });

        it('does not register helpers on engines that don\'t have helper support', async () => {

            const tempView = new Manager({
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
                relativeTo: 'test/templates',
                path: 'valid'
            });

            tempView.registerHelper('long', (string) => string + string.substr(-1).repeat(2));
            tempView.registerHelper('uppercase', (string) => string.toUpperCase());

            const rendered = await tempView.render('testHelpers', { something: 'uppercase' });
            expect(rendered).to.equal('<p>This is all  and this is  we like it!</p>');
        });

        it('prints a warning message when helpers fail to load', () => {

            const buffer = [];
            const oldWarn = console.warn;

            console.warn = (...args) => {

                const message = Util.format(...args);

                buffer.push(message);
            };

            try {
                new Manager({
                    engines: { html: { module: Handlebars.create() } },
                    relativeTo: 'test/templates',
                    path: 'valid',
                    helpersPath: 'invalid/helpers'
                });
            }
            finally {
                console.warn = oldWarn;
            }

            const output = buffer.join('\n');

            expect(output).to.match(/^WARNING:/);
            expect(output).to.contain('vision failed to load helper');

            expect(output).to.contain('invalid/helpers/bad1.js');
            expect(output).to.contain('invalid/helpers/bad1.json');

            // Ignore non-requirable file extensions
            expect(output).to.not.contain('invalid/helpers/bad1.foo');
            expect(output).to.not.contain('invalid/helpers/README.md');
        });

        it('reuses cached compilation', async () => {

            let gen = 0;
            const views = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compileMode: 'async',
                        module: {
                            compile: function (string, options, callback) {

                                ++gen;
                                const compiled = Handlebars.compile(string, options);
                                const renderer = function (context, opt, next) {

                                    return next(null, compiled(context, opt));
                                };

                                return callback(null, renderer);
                            }
                        }
                    }
                },
                isCached: true // isCached defaults to `true`
            });

            const original = await views.render('valid/test', { title: 'test', message: 'Hapi' });
            expect(original).to.exist();
            expect(original).to.contain('Hapi');

            const cached = await views.render('valid/test', { title: 'test', message: 'Hapi' });
            expect(cached).to.exist();
            expect(cached).to.contain('Hapi');

            expect(gen).to.equal(1);
        });

        it('disables caching', async () => {

            let gen = 0;
            const views = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compileMode: 'async',
                        module: {
                            compile: function (string, options, callback) {

                                ++gen;
                                const compiled = Handlebars.compile(string, options);
                                const renderer = function (context, opt, next) {

                                    return next(null, compiled(context, opt));
                                };

                                return callback(null, renderer);
                            }
                        }
                    }
                },
                isCached: false
            });

            const original = await views.render('valid/test', { title: 'test', message: 'Hapi' });
            expect(original).to.exist();
            expect(original).to.contain('Hapi');

            const notCached = await views.render('valid/test', { title: 'test', message: 'Hapi' });
            expect(notCached).to.exist();
            expect(notCached).to.contain('Hapi');

            expect(gen).to.equal(2);
        });

        it('recompiles partials/helpers when caching is disabled', async () => {

            const partialsPath = __dirname + '/templates/valid/partials';
            const helpersPath = __dirname + '/templates/valid/helpers';

            const originalPartialVal = '<nav>Nav</nav>';
            const originalNestedPartialVal = '<nav>Nested</nav>';
            const originalHelperVal = '\'use strict\';\n\nexports = module.exports = function (context) {\n\n    return context.toUpperCase();\n};\n';

            const mutateToUppercaseVal = 'i want to be uppercase';

            const resetMutatedValues = () => {

                return new Promise((resolve, reject) => {

                    Fs.writeFileSync(partialsPath + '/navToMutate.html', originalPartialVal);
                    Fs.writeFileSync(partialsPath + '/nested/navToMutate.html', originalNestedPartialVal);
                    Fs.writeFileSync(helpersPath + '/uppercaseToMutate.js', originalHelperVal);

                    return resolve();
                });
            };

            // Set everything correct to start in case a failed test leaves
            // these in a mutated state

            await resetMutatedValues();

            const views = new Manager({
                path: __dirname + '/templates/valid',
                partialsPath,
                helpersPath,
                engines: {
                    html: Handlebars
                },
                isCached: false
            });

            const originalPartialAndHelperValues = ' Nav:<nav>Nav</nav>|<nav>Nested</nav>\n<p>This is all I WANT TO BE UPPERCASE and this is how we like it!</p>';

            const original = await views.render('testHelpersAndPartials', {
                mutateToUppercase: mutateToUppercaseVal
            });

            expect(original).to.exist();
            expect(original).to.equal(originalPartialAndHelperValues);

            // Mutate the partials here

            Fs.writeFileSync(partialsPath + '/navToMutate.html', '<nav>N4v With Changes</nav>');
            Fs.writeFileSync(partialsPath + '/nested/navToMutate.html', '<nav>N3st3d With Changes</nav>');

            // Mutate the helpers here

            Fs.writeFileSync(helpersPath + '/uppercaseToMutate.js', '\'use strict\';\n\nexports = module.exports = function (context) {\n\n    return context.toUpperCase().split(\'\').sort().join(\'\').trim();\n};\n');

            const mutatedPartialsAndHelper = await views.render('testHelpersAndPartials', {
                mutateToUppercase: mutateToUppercaseVal
            });

            expect(mutatedPartialsAndHelper).to.exist();
            expect(mutatedPartialsAndHelper).to.equal(' Nav:<nav>N4v With Changes</nav>|<nav>N3st3d With Changes</nav>\n<p>This is all AABCEEEINOPPRSTTUW and this is how we like it!</p>');

            // Revert the mutations

            await resetMutatedValues();

            // Verify they've reverted correctly

            const changedBack = await views.render('testHelpersAndPartials', {
                mutateToUppercase: mutateToUppercaseVal
            });

            expect(changedBack).to.equal(originalPartialAndHelperValues);
        });

        it('does not recompile partials/helpers when caching is enabled', async () => {

            const partialsPath = __dirname + '/templates/valid/partials';
            const helpersPath = __dirname + '/templates/valid/helpers';

            const originalPartialVal = '<nav>Nav</nav>';
            const originalNestedPartialVal = '<nav>Nested</nav>';
            const originalHelperVal = '\'use strict\';\n\nexports = module.exports = function (context) {\n\n    return context.toUpperCase();\n};\n';

            const mutateToUppercaseVal = 'i want to be uppercase';

            const resetMutatedValues = () => {

                return new Promise((resolve, reject) => {

                    Fs.writeFileSync(partialsPath + '/navToMutate.html', originalPartialVal);
                    Fs.writeFileSync(partialsPath + '/nested/navToMutate.html', originalNestedPartialVal);
                    Fs.writeFileSync(helpersPath + '/uppercaseToMutate.js', originalHelperVal);

                    return resolve();
                });
            };

            // Set everything correct to start in case a failed test leaves
            // these in a mutated state

            await resetMutatedValues();

            const views = new Manager({
                path: __dirname + '/templates/valid',
                partialsPath,
                helpersPath,
                engines: {
                    html: Handlebars
                },
                isCached: true
            });

            const originalPartialAndHelperValues = ' Nav:<nav>Nav</nav>|<nav>Nested</nav>\n<p>This is all I WANT TO BE UPPERCASE and this is how we like it!</p>';

            const original = await views.render('testHelpersAndPartials', {
                mutateToUppercase: mutateToUppercaseVal
            });

            expect(original).to.exist();
            expect(original).to.equal(originalPartialAndHelperValues);

            // Mutate the partials here

            Fs.writeFileSync(partialsPath + '/navToMutate.html', '<nav>N4v With Changes</nav>');
            Fs.writeFileSync(partialsPath + '/nested/navToMutate.html', '<nav>N3st3d With Changes</nav>');

            // Mutate the helpers here

            Fs.writeFileSync(helpersPath + '/uppercaseToMutate.js', '\'use strict\';\n\nexports = module.exports = function (context) {\n\n    return context.toUpperCase().split(\'\').sort().join(\'\').trim();\n};\n');

            const mutatedPartialsAndHelper = await views.render('testHelpersAndPartials', {
                mutateToUppercase: mutateToUppercaseVal
            });

            expect(mutatedPartialsAndHelper).to.exist();
            expect(mutatedPartialsAndHelper).to.equal(originalPartialAndHelperValues);

            // Revert the mutations

            await resetMutatedValues();

            // Verify they've reverted correctly

            const changedBack = await views.render('testHelpersAndPartials', {
                mutateToUppercase: mutateToUppercaseVal
            });

            expect(changedBack).to.equal(originalPartialAndHelperValues);
        });
    });

    describe('_response()', () => {

        it('sets Content-Type', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates/valid'
            });

            const handler = function (request, h) {

                return h.view('test.html', { message: 'hi' });
            };

            server.route({ method: 'GET', path: '/', handler });
            const res = await server.inject('/');
            expect(res.headers['content-type']).to.contain('text/html');
        });

        it('does not override Content-Type', async () => {

            const server = Hapi.server();
            await server.register(Vision);

            server.views({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates/valid'
            });

            const handler = function (request, h) {

                return h.view('test.html', { message: 'hi' }).type('text/plain');
            };

            server.route({ method: 'GET', path: '/', handler });
            const res = await server.inject('/');
            expect(res.headers['content-type']).to.contain('text/plain');
        });

        it('errors on invalid template', async () => {

            const server = Hapi.server({ debug: false });
            await server.register(Vision);
            server.views({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates/invalid'
            });

            const handler = function (request, h) {

                return h.view('test.html', { message: 'hi' });
            };

            server.route({ method: 'GET', path: '/', handler });
            const res = await server.inject('/');
            expect(res.statusCode).to.equal(500);
        });

        it('passes the response object to the global context function', async () => {

            const server = Hapi.server();
            await server.register(Vision);
            server.views({
                engines: { html: Handlebars },
                path: __dirname + '/templates/valid',

                context: function (request) {

                    return {
                        message: request ? request.route.path : 'default message',

                        query: {
                            test: 'global'
                        }
                    };
                }
            });

            const handler = function (request, h) {

                return h.view('testContext');
            };

            server.route({ method: 'GET', path: '/', handler });
            const res = await server.inject('/');
            expect(res.payload).to.contain('<h1>/</h1>');
            expect(res.payload).to.contain('<h1>global</h1>');
        });
    });
});
