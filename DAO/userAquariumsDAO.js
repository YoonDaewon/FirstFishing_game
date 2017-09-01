var async = require('async');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');

function UserAquariumsDAO() {}

/**
 * 인덱스를 이용하여 유저 보유 수조 정보 가져오기
 * 
 * @param uidx
 * @param userAquariumIdx
 * @param callback 
 */
UserAquariumsDAO.readUserAquariumByIdx = function(uidx, userAquariumIdx, callback){
    var func = "readUserAquariumByIdx";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT idx, aquarium_idx, slot_count, cur_count, set_on, set_reward_time";
            sql     += " FROM DB_USER.TB_USER_AQUARIUM";
            sql     += " WHERE user_idx=? AND idx=?";
            var query = connection.query(sql, [uidx, userAquariumIdx], function(err, userAquarium){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func,err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    callback(null, userAquarium[0]);
                }
            });
        }
    });
};

/**
 * 유저가 보유하고 있는 수조 리스트 가져오기
 * 
 * @param uidx
 * @param callback
 */
UserAquariumsDAO.readUserAquariums = function(uidx, callback){
    var func = "readUserAquariums";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT idx, aquarium_idx, slot_count, cur_count, set_on, set_reward_time";
            sql     += " FROM DB_USER.TB_USER_AQUARIUM";
            sql     += " WHERE user_idx=?";
            var query = connection.query(sql, uidx, function(err, userAquariums){
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    callback(null, userAquariums);
                }
            });
        }
    });
};

/**
 * 수조 구입
 * 
 * @param uidx
 * @param aquarium
 * @param callback
 */
UserAquariumsDAO.buyUserAquarium = function(uidx, aquarium, callback){
    var func = "buyUserAquarium";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            connection.beginTransaction(function(err){
                if(err){
                    connection.release();
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_TRANSACTION);
                }
                else{
                    async.parallel([
                        // 유저 수조 추가
                        function(next){
                            var newData = {
                                user_idx: uidx,
                                aquarium_idx: aquarium.idx,
                                slot_count: aquarium.fishtankslot
                            };

                            var sql = "INSERT INTO DB_USER.TB_USER_AQUARIUM SET ?";
                            var query = connection.query(sql, newData, function(err){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else {
                                    next();
                                }
                            });
                        },
                        // 구매 금액 삭감
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_GAME SET";
                            if(aquarium.price_type === configGame.CURRENCY_TYPE.COIN)
                                sql += " coin=coin-?";
                            else
                                sql += " pearl=pearl-?";
                            sql     += " WHERE idx=?";
                            var query = connection.query(sql,[aquarium.price, uidx], function(err){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else{
                                    next();
                                }
                            });
                        },
                        // 수조 구입 로그 남기기
                        function(next){
                            next();
                        }
                    ],
                function(err){
                    if(err){
                        connection.rollback(function(){
                            connection.release();
                            callback(err);
                        });
                    }
                    else{
                        connection.commit(function(err){
                            if(err){
                                connection.rollback(function(){
                                    connection.release();
                                    logger.error(uidx, __filename, func, err);
                                    callback(errors.ERR_DB_TRANSACTION);
                                });
                            }
                            else{
                                connection.release();
                                callback();
                            }
                        });
                    }
                });
                }
            });
        }
    });
};

/**
 * 수조 확장
 * 
 * @param uidx
 * @param userAquariumIdx
 * @param aquarium
 * @param callback
 */
UserAquariumsDAO.extendAquariumScale = function(uidx, userAquariumIdx, aquarium, callback){
    var func = "extendAquariumScale";

};




module.exports = UserAquariumsDAO;