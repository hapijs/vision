'use strict';
// Load modules

const Fs = require('fs');
const Path = require('path');


// Declare internals

const internals = {};

module.exports = class Pages {

    constructor(dirPath) {

        this._dirPath = dirPath;
        this._cache = {};
        this.loadPagesIntoCache();
    }

    loadPagesIntoCache() {

        const self = this;
        Fs.readdirSync(this._dirPath).forEach((file) => {

            if (file[0] !== '.') {
                self._cache[file] = self.loadPageFile(file);
            }
        });
    }

    getAll() {

        return this._cache;
    }

    getPage(name) {

        return this._cache[name];
    }

    savePage(name, contents) {

        const pageName = Path.normalize(name);
        Fs.writeFileSync(Path.join(this._dirPath, pageName), contents);
        this._cache[pageName] = { pageName, contents };
    }

    loadPageFile(file) {

        const contents = Fs.readFileSync(Path.join(this._dirPath, file));

        return {
            name: file,
            contents: contents.toString()
        };
    }
};
