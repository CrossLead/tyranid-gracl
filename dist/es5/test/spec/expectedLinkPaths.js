"use strict";

var linkPaths = {
    'blog': {
        'organization': ['blog', 'organization']
    },
    'post': {
        'blog': ['post', 'blog'],
        'organization': ['post', 'blog', 'organization']
    },
    'team': {
        'organization': ['team', 'organization']
    },
    'user': {
        'organization': ['user', 'organization']
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = linkPaths;