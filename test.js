'use strict';

const stars = require('./stars');

stars.get(46.76, 11.95, 100000)
    .then(console.log)
    .catch(console.log);