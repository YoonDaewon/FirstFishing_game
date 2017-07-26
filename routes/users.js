var async = require('async');
var moment = require('moment');

var usersDAO = require('../DAO/UsersDAO');

function User() { }

User.show = function (req, res) {

    async.waterfall([
        function (callback) {
            usersDAO.connectDB(idx, user)
            {
                if (err) {
                    res.send("Fail to Connect DB");
                }
                else {
                    callback(null, user);
                }
            }
        }],
        function (err, result) {
            if (err) {
                res.send("fail");
            } else {
                res.send("succes");
            }
        }
    );
};