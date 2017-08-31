var async               = require('async');
var moment              = require('moment');

var poolCluster         = require('../lib/MySQLPoolCluster').PoolCluster;

var errors              = require('../message/errors');
var configGame          = require('../config/ConfigGame');

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
                            var sql = "SELECT level, exp, total_exp, vip_level, vip_exp, vip_total_exp, coin, pearl, coral, hook,";
                            sql     += " TIMESTAMPDIFF(SECOND, hook_charged_time, NOW()) AS diff_time,";
                            sql     += " FROM DB_USER.TB_USER_GAME WHERE idx=?";
                            var query = connection.query(sql, uidx, function(err, userGame){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else {
                                    if(!userGame[0]){
                                        logger.error(uidx, __filename, func, errors.ERR_USER_NO_EXIST);
                                        next(error.ERR_USER_NO_EXIST);
                                    }
                                    else {
                                        next(null, userGame[0]);
                                    }
                                }
                            });      
                        },
                        function(userGame, next){
                            // 시간에 따른 바늘 충전
                            var addHookCount = Math.floor(userGame.diff_time / configGame.SERVER_ENV.HOOK_CHARGE_TIME);
                            var addHook = Math.floor(userGame.level / configGame.SERVER_ENV.HOOK_COUNT);
                            var MaxHook = configGame.SERVER_ENV.HOOK_COUNT + addHook;

                            if(userGame.hook < MaxHook){
                                userGame.hook += addHookCount;
                                if(userGame.hook >= MaxHook){
                                    userGame.hook = MaxHook;
                                    userGame.diff_time = 0;
                                }
                                else {
                                    userGame.diif_time -= (configGame.SERVER_ENV.HOOK_CHARGE_TIME * addHookCount);
                                }
                                var sql = "UPDATE DB_USER.TB_USER_GAME SET hook=?, hook_charged_time=TIMESTAMPADD(SECOND, ?, hook_charged_time) WHERE idx=?";
                                var query = connection.query(sql,[userGame.hook, configGame.SERVER_ENV.HOOK_CHARGE_TIME * addHookCount, uidx], function(err){
                                    logger.debug(uidx, __filename, func, query.sql);
                                    if(err){
                                        logger.error(uidx, __filename, func, err);
                                        next(errors.ERR_DB_QUERY);
                                    }
                                    else {
                                        next(null, userGame);
                                    }
                                });
                            }
                            else {
                                userGame.diff_time = 0;
                                next(null, userGame);                                                                                                
                            }
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