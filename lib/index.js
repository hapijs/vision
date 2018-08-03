'use strict';

// Load modules

const Hoek = require('hoek');
const Joi = require('joi');
const Schemas = require('./schemas');

// Additional helper modules required in constructor

const Manager = require('./manager');


// Declare internals

const internals = {};

exports.Manager = Manager;

exports.plugin = {

    multiple: true,
    pkg: require('../package.json'),

    register: function (server, options) {

        return new internals.vision(server, options);
    }
};


internals.vision = class Vision {

    constructor(server, options) {

        if (Object.keys(options).length > 0) {
            this.assignManager(server)(options, server.realm.parent);
        }

        const rootRealm = this.getRootRealm(server.realm);

        const rootState = this.getState(rootRealm);

        if (rootState.setup) {
            return;
        }

        server.decorate('server', 'views', this.assignManager(server));
        server.decorate('server', 'render', this.render(server));
        server.decorate('request', 'render', this.render(server));
        server.decorate('handler', 'view', this.handler(server));
        server.decorate('toolkit', 'view', this.toolkitView(server));

        rootState.setup = true;
    }

    assignManager(rootServer) {

        const self = this;

        return function (options, realm) {

            realm = realm || this.realm;

            const realmState = self.getState(realm);

            Hoek.assert(!realmState.manager, 'Cannot set views manager more than once per realm');

            if (!options.relativeTo &&
                realm.settings.files.relativeTo) {

                options = Hoek.shallow(options);
                options.relativeTo = realm.settings.files.relativeTo;
            }

            const manager = new Manager(options);
            realmState.manager = manager;
            return manager;
        };
    }


    render(rootServer) {

        const self = this;

        return async function (template, context, options = {}) {

            const isServer = internals.isServer(this);
            const realm = (isServer ? this.realm : this.route.realm);

            const manager = self.nearestManager(realm);
            Hoek.assert(manager, 'Missing views manager');

            if (!isServer) {
                // this is the request
                return await manager.render(template, context, options, this);
            }

            return await manager.render(template, context, options);
        };
    }


    toolkitView(rootServer) {

        const self = this;

        return function (template, context, options) {

            const manager = self.nearestManager(this.realm);

            Hoek.assert(manager, 'Missing views manager');

            return this.response(manager._response(template, context, options, this.request));
        };
    }


    handler(rootServer) {

        return function (route, options) {

            Joi.assert(options, Schemas.handler, 'Invalid view handler options (' + route.path + ')');

            if (typeof options === 'string') {
                options = { template: options };
            }

            const settings = {                                                // Shallow copy to allow making dynamic changes to context
                template: options.template,
                context: options.context,
                options: options.options
            };

            return function (request, h) {

                const context = {
                    params: request.params,
                    payload: request.payload,
                    query: request.query,
                    pre: request.pre
                };

                if (settings.context) {                                     // Shallow copy to avoid cloning unknown objects
                    const keys = Object.keys(settings.context);
                    for (let i = 0; i < keys.length; ++i) {
                        const key = keys[i];
                        context[key] = settings.context[key];
                    }
                }

                return h.view(settings.template, context, settings.options);
            };
        };
    }


    getState(realm) {

        const state = realm.plugins.vision = realm.plugins.vision || {};
        return state;
    }


    nearestManager(realm) {

        const pluginState = this.getState(realm);
        if (pluginState.manager) {
            return pluginState.manager;
        }

        let parent = realm.parent;
        while (parent) {

            const parentState = this.getState(parent);
            if (parentState.manager) {
                return parentState.manager;
            }

            parent = parent.parent;
        }

        return null;
    }


    getRootRealm(realm) {

        while (realm.parent) {
            realm = realm.parent;
        }

        return realm;
    }
};

internals.isServer = (ref) => (typeof ref.route === 'function');
