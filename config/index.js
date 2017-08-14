'use strict';

var path = require('path');
var _ = require('lodash');

// All configurations will extend these options
var all = {
    // Game Title
    title: "First Fishing",
    env: process.env.NODE_ENV,

    // Root Path of server
    root: path.normalize(__dirname + "/../../.."),

    // Server port
    port: process.env.PORT || 5000,

    // Server IP
    ip: process.env.IP || "0.0.0.0",

    logger: {
        levels: {
            info: 1,
            error: 2,
            debug: 3
        },
        colors: {
            info: "green",
            debug: "blue",
            error: "red"
        }
    }
};

console.log("NODE_ENV: " + process.env.NODE_ENV);
module.exports = _.merge(
    all,
    require('./' + process.env.NODE_ENV + '.js') || {}
);