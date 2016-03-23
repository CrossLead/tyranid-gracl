"use strict";

exports.expectedLinkPaths = {
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