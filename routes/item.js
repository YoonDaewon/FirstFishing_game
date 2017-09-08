var async = require('async');

var crypt = require('../lib/Crypt');

var errors = require('../message/errors');

var usersDAO = require('../DAO/usersDAO');
var userItemInventoriesDAO = require('../DAO/userItemInventoriesDAO');

function Item() {}



module.exports = Item;