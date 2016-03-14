"use strict";

var linkPaths = {
    'Blog': {
        'Organization': ['Blog', 'Organization']
    },
    'Post': {
        'Blog': ['Post', 'Blog']
    },
    'Team': {
        'Organization': ['Team', 'Organization']
    },
    'User': {
        'Organization': ['User', 'Team', 'Organization']
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = linkPaths;