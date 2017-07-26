var async               = require('async');
var moment              = require('moment');

var poolCluster         = require('../lib/MySQLPoolCluster').PoolCluster;

function UsersDAO() {}

/**
 * DB연동 테스트
 *
 * @param uidx
 * @param callback
 */
UsersDAO.connectDB = function(uidx, callback) {
    var func = "connectDB";

    poolCluster.getConnection(function(err, connection) {
        if(err) {
            res.send('DB connection Error');
        } else {
            var sql = "SELECT *";
            sql     += " FROM test.user";
            sql     += " WHERE idx=?";
            var query = connection.query(sql, [uidx], function(err, user) {
                connection.release();
                if(err) {
                    res.send('Select fail');
                } else {
                    callback(null, user[0]);
                }
            });
        }
    });
};

module.exports = UsersDAO;