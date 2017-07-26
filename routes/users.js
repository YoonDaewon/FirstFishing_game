var async = require('async');
var moment = require('moment');

var usersDAO = require('../DAO/usersDAO');

function User() { }

User.show = function (req, res) {
    var idx = req.params.idx;

    async.waterfall([
        function (callback) {
            usersDAO.connectDB(idx, function (err, user) {
                if (err) {
                    res.send("Fail to Connect DB");
                }
                else {
                    callback(null, user);
                }
            });
        }
    ],
        function (err, result) {
            if (err) {
                res.send("fail");
            } else {
                res.send(result);
            }
        }
    );
};

module.exports = User;