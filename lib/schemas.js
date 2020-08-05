'use strict';

const Validate = require('@hapi/validate');


const internals = {};


// Root schemas

exports.handler = Validate.alternatives([
    Validate.string(),
    Validate.object({
        template: Validate.string(),
        context: Validate.object(),
        options: Validate.object()
    })
]);


// Manager schemas

exports.viewOverride = Validate.object({
    path: [Validate.array().items(Validate.string()), Validate.string()],
    relativeTo: Validate.string(),
    compileOptions: Validate.object(),
    runtimeOptions: Validate.object(),
    layout: Validate.string().allow(false, true),
    layoutKeyword: Validate.string(),
    layoutPath: [Validate.array().items(Validate.string()), Validate.string()],
    encoding: Validate.string(),
    allowAbsolutePaths: Validate.boolean(),
    allowInsecureAccess: Validate.boolean(),
    contentType: Validate.string()
});


exports.viewBase = exports.viewOverride.keys({
    partialsPath: [Validate.array().items(Validate.string()), Validate.string()],
    helpersPath: [Validate.array().items(Validate.string()), Validate.string()],
    isCached: Validate.boolean(),
    compileMode: Validate.string().valid('sync', 'async'),
    defaultExtension: Validate.string()
});


exports.manager = exports.viewBase.keys({
    engines: Validate.object().required(),
    context: [Validate.object(), Validate.func()]
});


exports.view = exports.viewBase.keys({
    module: Validate.object({
        compile: Validate.func().required()
    })
        .options({ allowUnknown: true })
        .required()
});
