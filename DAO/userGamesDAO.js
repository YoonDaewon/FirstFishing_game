var async               = require('async');
var moment              = require('moment');

var poolCluster         = require('../lib/MySQLPoolCluster').PoolCluster;

var errors              = require('../message/errors');

function UserGamesDAO() {}

/**
 * 유저 게임 정보 불러오기
 * 
 * @param uidx
 * @param callback
 */
UserGamesDAO.readUserGameInfo = function(uidx, callback){
    var func = "readUserGameInfo";

    poolCluster.getConnection(function(err, connection){
        if(err) {
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            connection.beginTransaction(function(err){
                if(err){
                    connection.release();
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_TRANSACTION);
                }
                else {
                    async.waterfall([
                        function(next){
                            // 유저 정보를 가져옴                  
                        },
                        function(userGame, next){
                            // 시간에 따른 바늘 충전
                        }
                    ],
                function(err, userGame){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            callback(err);
                        });
                    }
                    else {
                        connection.commit(function(err){
                            if(err){
                                connection.rollback(function(){
                                    connection.release();
                                    logger.error(uidx, __filename, func, err);
                                    callback(errors.ERR_DB_TRANSACTION);
                                });
                            }
                            else {
                                connection.release();
                                callback(null, userGame);
                            }
                        });
                    }
                });
                }
            });
        }
    });
};

module.exports = UserGamesDAO;