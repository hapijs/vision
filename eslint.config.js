'use strict';

const HapiPlugin = require('@hapi/eslint-plugin');

module.exports = [
    {
        ignores: ['node_modules/**', 'test/templates/**']
    },
    ...HapiPlugin.configs.module
];
