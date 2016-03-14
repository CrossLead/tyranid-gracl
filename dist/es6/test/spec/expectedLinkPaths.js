"use strict";
const linkPaths = {
    'Blog': {
        'Organization': [
            'Blog',
            'Organization'
        ]
    },
    'Post': {
        'Blog': [
            'Post',
            'Blog'
        ]
    },
    'Team': {
        'Organization': [
            'Team',
            'Organization'
        ]
    },
    'User': {
        'Organization': [
            'User',
            'Team',
            'Organization'
        ]
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = linkPaths;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWRMaW5rUGF0aHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L3NwZWMvZXhwZWN0ZWRMaW5rUGF0aHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUlBLE1BQU0sU0FBUyxHQUErQztJQUM1RCxNQUFNLEVBQUU7UUFDTixjQUFjLEVBQUU7WUFDZCxNQUFNO1lBQ04sY0FBYztTQUNmO0tBQ0Y7SUFDRCxNQUFNLEVBQUU7UUFDTixNQUFNLEVBQUU7WUFDTixNQUFNO1lBQ04sTUFBTTtTQUNQO0tBQ0Y7SUFDRCxNQUFNLEVBQUU7UUFDTixjQUFjLEVBQUU7WUFDZCxNQUFNO1lBQ04sY0FBYztTQUNmO0tBQ0Y7SUFDRCxNQUFNLEVBQUU7UUFDTixjQUFjLEVBQUU7WUFDZCxNQUFNO1lBQ04sTUFBTTtZQUNOLGNBQWM7U0FDZjtLQUNGO0NBQ0YsQ0FBQztBQUVGO2tCQUFlLFNBQVMsQ0FBQyJ9