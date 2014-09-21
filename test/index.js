// Load modules

var Handlebars = require('handlebars');
var Jade = require('jade');
var Lab = require('lab');
var Hapi = require('hapi');
var Vision = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var before = lab.before;
var after = lab.after;
var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;


describe('Vision', function () {

    it('should not fail if rendered template returns undefined', function (done) {

        var server = new Hapi.Server({
            views: {
                engines: {
                    html: {
                        module: {
                            compile: function (template, options) {

                                return function (context, options) {

                                    return undefined;
                                }
                            }
                        },
                        path: __dirname + '/templates/valid'
                    }
                }
            }
        });

        var handler = function (request, reply) {

            return reply.view('test.html');
        };

        server.route({ method: 'GET', path: '/', config: { handler: handler } });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('should render handlebars template', function (done) {

        var server = new Hapi.Server({
            views: {
                engines: {
                    html: {
                        module: require('handlebars'),
                        path: __dirname + '/templates/valid'
                    }
                }
            }
        });

        var handler = function (request, reply) {

            return reply.view('test.html', { message: "Hello World!" });
        };

        server.route({ method: 'GET', path: '/handlebars', config: { handler: handler } });

        server.inject('/handlebars', function (res) {

            expect(res.result).to.exist;
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('sets content type', function (done) {

        var server = new Hapi.Server({
            views: {
                engines: {
                    html: {
                        module: require('handlebars'),
                        path: __dirname + '/templates/valid',
                        contentType: 'something/else'
                    }
                }
            }
        });

        var handler = function (request, reply) {

            return reply.view('test', { message: "Hello World!" });
        };

        server.route({ method: 'GET', path: '/', config: { handler: handler } });
        server.inject('/', function (res) {

            expect(res.headers['content-type']).to.equal('something/else');
            expect(res.result).to.exist;
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('returns error on invalid template path', function (done) {

        var server = new Hapi.Server({
            debug: false,
            views: {
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/invalid'
            }
        });

        var handler = function (request, reply) {

            reply.view('test', { message: 'Ohai' });
        };

        var handler = function (request, reply) {

            return reply.view('test', { message: 'Hello, World!' });
        };

        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('returns a compiled Handlebars template reply', function (done) {

        var server = new Hapi.Server({
            views: {
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid'
            }
        });

        var handler = function (request, reply) {

            return reply.view('test', { message: 'Hello, World!' });
        };

        server.route({ method: 'GET', path: '/views', config: { handler: handler } });

        server.inject('/views', function (res) {

            expect(res.result).to.exist;
            expect(res.result).to.have.string('Hello, World!');
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('returns an error absolute path given and allowAbsolutePath is false (by default)', function (done) {

        var server = new Hapi.Server({
            debug: false,
            views: {
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid'
            }
        });

        var absoluteHandler = function (request, reply) {

            return reply.view(__dirname + '/templates/valid/test', { message: 'Hello, World!' });
        };

        server.route({ method: 'GET', path: '/views/abspath', config: { handler: absoluteHandler } });

        server.inject('/views/abspath', function (res) {

            expect(res.result).to.exist;
            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('returns an error if path given includes ../ and allowInsecureAccess is false (by default)', function (done) {

        var server = new Hapi.Server({
            debug: false,
            views: {
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid'
            }
        });

        var insecureHandler = function (request, reply) {

            return reply.view('../test', { message: 'Hello, World!' });
        };

        server.route({ method: 'GET', path: '/views/insecure', config: { handler: insecureHandler } });

        server.inject('/views/insecure', function (res) {

            expect(res.result).to.exist;
            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('allows if path given includes ../ and allowInsecureAccess is true', function (done) {

        var server = new Hapi.Server({
            debug: false,
            views: {
                engines: { 'html': require('handlebars') },
                allowInsecureAccess: true,
                path: __dirname + '/templates/valid/helpers'
            }
        });

        var insecureHandler = function (request, reply) {

            return reply.view('../test', { message: 'Hello, World!' });
        };

        server.route({ method: 'GET', path: '/views/insecure', config: { handler: insecureHandler } });

        server.inject('/views/insecure', function (res) {

            expect(res.result).to.exist;
            expect(res.result).to.have.string('Hello, World!');
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('returns an error if template does not exist', function (done) {

        var server = new Hapi.Server({
            debug: false,
            views: {
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid'
            }
        });

        var nonexistentHandler = function (request, reply) {

            return reply.view('testNope', { message: 'Hello, World!' });
        };

        server.route({ method: 'GET', path: '/views/nonexistent', config: { handler: nonexistentHandler } });

        server.inject('/views/nonexistent', function (res) {

            expect(res.result).to.exist;
            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('returns an error if engine.compile throws', function (done) {

        var server = new Hapi.Server({
            debug: false,
            views: {
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid'
            }
        });

        var invalidHandler = function (request, reply) {

            return reply.view('badmustache', { message: 'Hello, World!' }, { path: __dirname + '/templates/valid/invalid' });
        };

        server.route({ method: 'GET', path: '/views/invalid', config: { handler: invalidHandler } });

        server.inject('/views/invalid', function (res) {

            expect(res.result).to.exist;
            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    describe('Layout', function (done) {

        it('returns response', function (done) {

            var layoutServer = new Hapi.Server();
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            var handler = function (request, reply) {

                return reply.view('valid/test', { title: 'test', message: 'Hapi' });
            };

            layoutServer.route({ method: 'GET', path: '/', handler: handler });

            layoutServer.inject('/', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('<!DOCTYPE html>\n<html>\n    <head>\n        <title>test</title>\n    </head>\n    <body>\n        <div>\n    <h1>Hapi</h1>\n</div>\n\n    </body>\n</html>\n');
                done();
            });
        });

        it('returns response with basePath and absolute path', function (done) {

            var layoutServer = new Hapi.Server();
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                basePath: '/none/shall/pass',
                path: __dirname + '/templates',
                layout: true
            });

            var handler = function (request, reply) {

                return reply.view('valid/test', { title: 'test', message: 'Hapi' });
            };

            layoutServer.route({ method: 'GET', path: '/', handler: handler });

            layoutServer.inject('/', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('<!DOCTYPE html>\n<html>\n    <head>\n        <title>test</title>\n    </head>\n    <body>\n        <div>\n    <h1>Hapi</h1>\n</div>\n\n    </body>\n</html>\n');
                done();
            });
        });

        it('returns response with layout override', function (done) {

            var layoutServer = new Hapi.Server();
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            var handler = function (request, reply) {

                return reply.view('valid/test', { title: 'test', message: 'Hapi' }, { layout: 'otherLayout' });
            };

            layoutServer.route({ method: 'GET', path: '/', handler: handler });

            layoutServer.inject('/', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('test:<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('returns response with custom server layout', function (done) {

            var layoutServer = new Hapi.Server();
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: 'otherLayout'
            });

            var handler = function (request, reply) {

                return reply.view('valid/test', { title: 'test', message: 'Hapi' });
            };

            layoutServer.route({ method: 'GET', path: '/', handler: handler });

            layoutServer.inject('/', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('test:<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('returns response with custom server layout and path', function (done) {

            var layoutServer = new Hapi.Server();
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                basePath: __dirname,
                path: 'templates',
                layoutPath: 'templates/layout',
                layout: 'elsewhere'
            });

            var handler = function (request, reply) {

                return reply.view('valid/test', { title: 'test', message: 'Hapi' });
            };

            layoutServer.route({ method: 'GET', path: '/', handler: handler });

            layoutServer.inject('/', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('test+<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('errors on missing layout', function (done) {

            var layoutServer = new Hapi.Server({ debug: false });
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: 'missingLayout'
            });

            var handler = function (request, reply) {

                return reply.view('valid/test', { title: 'test', message: 'Hapi' });
            };

            layoutServer.route({ method: 'GET', path: '/', handler: handler });

            layoutServer.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('errors on invalid layout', function (done) {

            var layoutServer = new Hapi.Server({ debug: false });
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: 'invalidLayout'
            });

            var handler = function (request, reply) {

                return reply.view('valid/test', { title: 'test', message: 'Hapi' });
            };

            layoutServer.route({ method: 'GET', path: '/', handler: handler });

            layoutServer.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('returns response without layout', function (done) {

            var layoutServer = new Hapi.Server();
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            var handler = function (request, reply) {

                return reply.view('valid/test', { title: 'test', message: 'Hapi' }, { layout: false });
            };

            layoutServer.route({ method: 'GET', path: '/', handler: handler });

            layoutServer.inject('/', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('returns error on layoutKeyword conflict', function (done) {

            var layoutServer = new Hapi.Server({ debug: false });
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid',
                layout: true
            });

            var handler = function (request, reply) {

                return reply.view('test', { message: 'Hello, World!', content: 'fail' });
            };

            layoutServer.route({ method: 'GET', path: '/conflict', handler: handler });

            layoutServer.inject('/conflict', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('returns an error absolute path given and allowAbsolutePath is false (by default)', function (done) {

            var layoutServer = new Hapi.Server({ debug: false });
            layoutServer.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid',
                layout: true
            });

            var handler = function (request, reply) {

                return reply.view('test', { message: 'Hello, World!' }, { path: __dirname + '/templates/valid/invalid' });
            };

            layoutServer.route({ method: 'GET', path: '/abspath', handler: handler });

            layoutServer.inject('/abspath', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });

    describe('Caching', function () {

        it('should not throw if local cache disabled', function (done) {

            var fn = function () {

                var testServer = new Hapi.Server({
                    views: {
                        engines: { 'html': require('handlebars') },
                        path: __dirname + '/templates/valid'
                    }
                });

                var handler = function (request, reply) {

                    return reply.view('test.html', { message: "Hello World!" });
                };

                testServer.route({ method: 'GET', path: '/handlebars', config: { handler: handler } });
                testServer.inject('/handlebars', function (res) {

                    expect(res.result).to.exist;
                    expect(res.statusCode).to.equal(200);
                    testServer.inject('/handlebars', function (res) {

                        expect(res.result).to.exist;
                        expect(res.statusCode).to.equal(200);
                        // done();
                    });
                });
            };
            expect(fn).to.not.throw();
            done();
        });

        it('should use the cache if all caching enabled', function (done) {

            var testServer = new Hapi.Server({
                views: {
                    engines: { 'html': require('handlebars') },
                    path: __dirname + '/templates/valid',
                    isCached: true
                }
            });

            var handler = function (request, reply) {

                return reply.view('test.html', { message: "Hello World!" });
            };

            testServer.route({ method: 'GET', path: '/handlebars', config: { handler: handler } });
            testServer.inject('/handlebars', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                testServer.inject('/handlebars', function (res) {

                    expect(res.result).to.exist;
                    expect(res.statusCode).to.equal(200);
                    done();
                });
            });
        });

        it('should not throw if global cache disabled', function (done) {

            var testServer = new Hapi.Server({
                views: {
                    engines: { 'html': require('handlebars') },
                    path: __dirname + '/templates/valid',
                    isCached: false
                }
            });

            var handler = function (request, reply) {

                return reply.view('test.html', { message: "Hello World!" });
            };

            testServer.route({ method: 'GET', path: '/handlebars', config: { handler: handler } });
            testServer.inject('/handlebars', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                done();
            });
        });
    });

    describe('Multiple', function () {

        it('should render jade template', function (done) {

            var server = new Hapi.Server({
                debug: false,
                views: {
                    path: __dirname + '/templates/valid',
                    engines: {
                        'html': require('handlebars'),
                        'jade': require('jade'),
                        'hbar': {
                            module: {
                                compile: function (engine) { return engine.compile; }
                            }
                        }
                    }
                }
            });

            var testMultiHandlerJade = function (request, reply) {

                return reply.view('testMulti.jade', { message: "Hello World!" });
            };

            server.route({ method: 'GET', path: '/jade', config: { handler: testMultiHandlerJade } });

            server.inject('/jade', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('should render handlebars template', function (done) {

            var server = new Hapi.Server({
                debug: false,
                views: {
                    path: __dirname + '/templates/valid',
                    engines: {
                        'html': require('handlebars'),
                        'jade': require('jade'),
                        'hbar': {
                            module: {
                                compile: function (engine) { return engine.compile; }
                            }
                        }
                    }
                }
            });

            var handler = function (request, reply) {

                return reply.view('test.html', { message: "Hello World!" });
            };

            server.route({ method: 'GET', path: '/handlebars', config: { handler: handler } });

            server.inject('/handlebars', function (res) {

                expect(res.result).to.exist;
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('should return 500 on unknown extension', function (done) {

            var server = new Hapi.Server({
                debug: false,
                views: {
                    path: __dirname + '/templates/valid',
                    engines: {
                        'html': require('handlebars'),
                        'jade': require('jade'),
                        'hbar': {
                            module: {
                                compile: function (engine) { return engine.compile; }
                            }
                        }
                    }
                }
            });

            var testMultiHandlerUnknown = function (request, reply) {

                return reply.view('test', { message: "Hello World!" });
            };

            server.route({ method: 'GET', path: '/unknown', config: { handler: testMultiHandlerUnknown } });

            server.inject('/unknown', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('should return 500 on missing extension engine', function (done) {

            var server = new Hapi.Server({
                debug: false,
                views: {
                    path: __dirname + '/templates/valid',
                    engines: {
                        'html': require('handlebars'),
                        'jade': require('jade'),
                        'hbar': {
                            module: {
                                compile: function (engine) { return engine.compile; }
                            }
                        }
                    }
                }
            });

            var testMultiHandlerMissing = function (request, reply) {

                return reply.view('test.xyz', { message: "Hello World!" });
            };

            server.route({ method: 'GET', path: '/missing', config: { handler: testMultiHandlerMissing } });

            server.inject('/missing', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });

    describe('#render', function () {

        it('renders with async compile', function (done) {

            var views = new Vision.Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compileMode: 'async',
                        module: {
                            compile: function (string, options, callback) {

                                var compiled = Handlebars.compile(string, options);
                                var renderer = function (context, opt, next) {

                                    return next(null, compiled(context, opt));
                                };

                                return callback(null, renderer);
                            }
                        }
                    }
                }
            });

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist;
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('returns error on sync compile that throws', function (done) {

            var views = new Vision.Manager({
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

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist;
                expect(err.message).to.equal('Bad bad view');
                done();
            });
        });

        it('allows valid (no layouts)', function (done) {

            var testView = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: false
            });

            testView.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist;
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('renders without context', function (done) {

            var testView = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates'
            });

            testView.render('valid/test', null, null, function (err, rendered, config) {

                expect(rendered).to.exist;
                expect(rendered).to.equal('<div>\n    <h1></h1>\n</div>\n');
                done();
            });
        });

        it('uses specified default ext', function (done) {

            var testView = new Vision.Manager({
                defaultExtension: 'html',
                engines: { html: require('handlebars'), jade: Jade },
                path: __dirname + '/templates'
            });

            testView.render('valid/test', null, null, function (err, rendered, config) {

                expect(rendered).to.exist;
                expect(rendered).to.equal('<div>\n    <h1></h1>\n</div>\n');
                done();
            });
        });

        it('allows relative path with no base', function (done) {

            var testView = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: './test/templates',
                layout: false
            });

            testView.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist;
                expect(rendered).to.equal('<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('allows valid (with layouts)', function (done) {

            var testViewWithLayouts = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            testViewWithLayouts.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist;
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('allows absolute path', function (done) {

            var testViewWithLayouts = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: __dirname + '/templates/layout',
                allowAbsolutePaths: true
            });

            testViewWithLayouts.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist;
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('errors on invalid layout', function (done) {

            var views = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: 'badlayout'
            });

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist;
                expect(err.message).to.equal('Parse error on line 1:\n{{}\n--^\nExpecting \'ID\', \'DATA\', got \'INVALID\': Parse error on line 1:\n{{}\n--^\nExpecting \'ID\', \'DATA\', got \'INVALID\'');
                done();
            });
        });

        it('errors on invalid layout path', function (done) {

            var views = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: '/badlayout'
            });

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist;
                expect(err.message).to.equal('Absolute paths are not allowed in views');
                done();
            });
        });

        it('allows valid jade layouts', function (done) {

            var testViewWithJadeLayouts = new Vision.Manager({
                engines: { jade: Jade },
                path: __dirname + '/templates' + '/valid/',
                layout: true
            });

            testViewWithJadeLayouts.render('index', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('should work and not throw without jade layouts', function (done) {

            var testViewWithoutJadeLayouts = new Vision.Manager({
                engines: { jade: Jade },
                path: __dirname + '/templates' + '/valid/',
                layout: false
            });

            testViewWithoutJadeLayouts.render('test', { title: 'test', message: 'Hapi Message' }, null, function (err, rendered, config) {

                expect(rendered).to.contain('Hapi Message');
                done();
            });
        });

        it('allows basePath, template name, and no path', function (done) {

            var views = new Vision.Manager({ engines: { html: require('handlebars') } });
            views.render('test', { title: 'test', message: 'Hapi' }, { basePath: __dirname + '/templates/valid' }, function (err, rendered, config) {

                expect(rendered).to.exist;
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('errors when referencing non existant partial (with layouts)', function (done) {

            var testViewWithLayouts = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            testViewWithLayouts.render('invalid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist;
                done();
            });
        });

        it('errors when referencing non existant partial (no layouts)', function (done) {

            var testView = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: false
            });

            testView.render('invalid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist;
                done();
            });

        });

        it('errors if context uses layoutKeyword as a key', function (done) {

            var testViewWithLayouts = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            var opts = { title: 'test', message: 'Hapi', content: 1 };
            testViewWithLayouts.render('valid/test', opts, null, function (err, rendered, config) {

                expect(err).to.exist;
                done();
            });
        });

        it('errors on compile error (invalid template code)', function (done) {

            var testView = new Vision.Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: false
            });

            testView.render('invalid/badmustache', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });

        it('loads partials and be able to render them', function (done) {

            var tempView = new Vision.Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials'
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('loads partials from relative path without base', function (done) {

            var tempView = new Vision.Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: './test/templates/valid/partials'
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('loads partials from relative path without base (no dot)', function (done) {

            var tempView = new Vision.Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: 'test/templates/valid/partials'
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('loads partials and render them EVEN if viewsPath has trailing slash', function (done) {

            var tempView = new Vision.Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials/'
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.exist;
                expect(rendered.length).above(1);
                done();
            });
        });

        it('skips loading partials and helpers if engine does not support them', function (done) {

            var tempView = new Vision.Manager({
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials',
                helpersPath: __dirname + '/templates/valid/helpers',
                engines: { html: Jade }
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal('Nav:{{> nav}}|{{> nested/nav}}');
                done();
            });
        });

        it('loads helpers and render them', function (done) {

            var tempView = new Vision.Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                helpersPath: __dirname + '/templates/valid/helpers'
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });

        it('loads helpers and render them when helpersPath ends with a slash', function (done) {

            var tempView = new Vision.Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                helpersPath: __dirname + '/templates/valid/helpers/'
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });

        it('loads helpers using relative paths', function (done) {

            var tempView = new Vision.Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                basePath: './test/templates',
                path: './valid',
                helpersPath: './valid/helpers'
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });

        it('loads helpers using relative paths (without dots)', function (done) {

            var tempView = new Vision.Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                basePath: 'test/templates',
                path: 'valid',
                helpersPath: 'valid/helpers'
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });
    });

    describe('#handler', function () {

        it('handles routes to views', function (done) {

            var options = {
                views: {
                    engines: { html: require('handlebars') },
                    path: __dirname + '/templates'
                }
            };

            var server = new Hapi.Server(options);
            server.handler('viewTest', Vision.handler);

            server.route({ method: 'GET', path: '/{param}', handler: { viewTest: 'valid/handler' } });
            server.inject({
                method: 'GET',
                url: '/hello'
            }, function (res) {

                expect(res.result).to.contain('hello');
                done();
            });
        });

        it('handles custom context', function (done) {

            var options = {
                views: {
                    engines: { jade: Jade },
                    path: __dirname + '/templates'
                }
            };

            var server = new Hapi.Server(options);
            server.handler('viewTest', Vision.handler);

            server.route({ method: 'GET', path: '/', handler: { viewTest: { template: 'valid/index', context: { message: 'heyloo' } } } });
            server.inject('/', function (res) {

                expect(res.result).to.contain('heyloo');
                done();
            });
        });

        it('handles custom options', function (done) {

            var options = {
                views: {
                    engines: { html: require('handlebars') },
                    path: __dirname + '/templates',
                    layoutPath: __dirname + '/templates/layout'
                }
            };

            var server = new Hapi.Server(options);
            server.handler('viewTest', Vision.handler);

            server.route({ method: 'GET', path: '/', handler: { viewTest: { template: 'valid/options', options: { layout: 'elsewhere' } } } });
            server.inject('/', function (res) {

                expect(res.result).to.contain('+hello');
                done();
            });
        });

        it('includes prerequisites in the default view context', function (done) {

            var pre = function (request, reply) {

                reply('PreHello');
            };

            var options = {
                views: {
                    engines: { html: require('handlebars') },
                    path: __dirname + '/templates'
                }
            };

            var server = new Hapi.Server(options);
            server.handler('viewTest', Vision.handler);

            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        { method: pre, assign: 'p' }
                    ],
                    handler: {
                        viewTest: 'valid/handler'
                    }
                }
            });

            server.inject('/', function (res) {

                expect(res.result).to.contain('PreHello');
                done();
            });
        });

        it('does not override Content-Type', function (done) {

            var options = {
                views: {
                    engines: { jade: Jade },
                    path: __dirname + '/templates'
                }
            };

            var server = new Hapi.Server(options);
            server.route({ method: 'GET', path: '/', handler: function (request, reply) { reply.view('valid/index').type('text/plain'); } });
            server.inject('/', function (res) {

                expect(res.headers['content-type']).to.contain('text/plain');
                done();
            });
        });
    });
});
