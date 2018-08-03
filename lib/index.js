'use strict';

// Load modules

const Hoek = require('hoek');
const Joi = require('joi');
const Schemas = require('./schemas');

// Additional helper modules required in constructor

const Manager = require('./manager');


// Declare internals

const internals = {};

exports.plugin = {

    multiple: true,
    pkg: require('../package.json'),

    register: function (server, options) {

        return new internals.vision(server, options);
    }
};


const Vision = internals.vision = class Vision {

    constructor(server, options) {

        if (Object.keys(options).length > 0) {
            this.assignManager(server)(options, server.realm.parent);
        }

        const rootRealm = this.getRootRealm(server.realm);

        const rootState = Vision.getState(rootRealm);

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


    static getState(realm) {

        const state = realm.plugins.vision = realm.plugins.vision || {};
        return state;
    }


    static getNearestManager(realm) {

        const pluginState = Vision.getState(realm);
        if (pluginState.manager) {
            return pluginState.manager;
        }

        let parent = realm.parent;
        while (parent) {

            const parentState = Vision.getState(parent);
            if (parentState.manager) {
                return parentState.manager;
            }

            parent = parent.parent;
        }

        return null;
    }


    assignManager(rootServer) {

        return function (options, realm) {

            realm = realm || this.realm;

            const realmState = Vision.getState(realm);

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

        return async function (template, context, options = {}) {

            const isServer = internals.isServer(this);
            const realm = (isServer ? this.realm : this.route.realm);

            const manager = Vision.getNearestManager(realm);
            Hoek.assert(manager, 'Missing views manager');

            if (!isServer) {
                // this is the request
                return await manager.render(template, context, options, this);
            }

            return await manager.render(template, context, options);
        };
    }


    toolkitView(rootServer) {

        return function (template, context, options) {

            const manager = Vision.getNearestManager(this.realm);

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


    getRootRealm(realm) {

        while (realm.parent) {
            realm = realm.parent;
        }

        return realm;
    }
};


exports.getManager = (ref) => {

    const errMsg = 'Must pass a server, request, or realm to "Vision.getManager"';

    if (!ref) {
        throw new Error(errMsg);
    }

    let realm;

    if (ref.server) {
        realm = ref.server.realm;
    }
    else if (ref.realm) {
        realm = ref.realm;
    }
    else if (ref.plugins) {
        realm = ref;
    }
    else {
        throw new Error(errMsg);
    }

    return Vision.getNearestManager(realm);
};


internals.isServer = (ref) => (typeof ref.route === 'function');
