'use strict';

module.exports = [
    {
        name: 'PI',
        site: 'MRN',
        contexts: [
            {
                name: 'studies',
                permissions: [
                    { model: 'studies', actions: ['GET'] },
                    {
                        model: 'subjects',
                        actions: [ 'GET', 'PUT', 'POST', 'DELETE' ]
                    },
                    {
                        model: 'assessments',
                        actions: [ 'GET', 'PUT', 'POST' ]
                    }
                ]
            }
        ]
    },
    {
        name: 'Coordinator',
        site: 'MRN',
        permissions: [
            { model: 'studies', actions: ['GET'] },
            {
                model: 'subjects',
                actions: [ 'GET', 'PUT', 'POST', 'DELETE' ]
            },
            {
                model: 'assessments',
                actions: [ 'GET', 'PUT', 'POST' ]
            }
        ]
    }
];
