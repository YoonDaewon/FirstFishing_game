var async = require('async');
var moment = require('moment');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');

function UserFishesDAO() {}

/**
 * 잡은 물고기 판매
 * 
 * @param uidx
 * @param fish
 * @param callback
 */
UserFishesDAO.sellCaughtFish = function(uidx, fish, callback){
    var func = "sellCaughtFish";

    poolCluster.getConnection(function(err, connection){
        if(err){
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
                    async.parallel([
                        // 물고기 판매 금액 증가
                        function(next){
                            var UpdateGameData = {};
                            async.waterfall([
                                // 보유 캡슐 경험치 옵션 적용
                                function(nnext){
                                    var sql = "SELECT B.bData10 FROM DB_USER.TB_USER_ITEM_INVENTORY A, DB_GAME_DATA.TB_ITEM B";
                                    sql     += " WHERE A.user_idx=? AND A.item_type=? AND is_equip='y' AND A.item_idx=B.wRefID";
                                    var query = connection.query(sql, [uidx, configGame.ITEM_TYPE.CAPSULE_EXP], function(err, expCapsule){
                                        logger.debug(uidx, __filename, func, query.sql);
                                        if(err){
                                            logger.error(uidx, __filename, func, err);
                                            nnext(errors.ERR_DB_QUERY);
                                        }
                                        else {
                                            nnext(null, expCapsule[0]);
                                        }
                                    });
                                },
                                // 코인 증가 옵션 적용
                                function(expCapsule, nnext){
                                    var sql = "SELECT B.bData9 FROM DB_USER.TB_USER_ITEM_INVENTORY A, DB_GAME_DATA.TB_ITEM B";
                                    sql     += " WHERE A.user_idx=? AND A.item_type=? AND is_equip='y' AND A.item_idx=B.wRefID";
                                    var query = connection.query(sql, [uidx, configGame.ITEM_TYPE.CAPSULE_COIN], function(err, coinCapsule){
                                        logger.debug(uidx, __filename, func, query.sql);
                                        if(err){
                                            logger.error(uidx, __filename, func, err);
                                            nnext(errors.ERR_DB_QUERY);
                                        }
                                        else{
                                            nnext(null, expCapsule, coinCapsule[0]);
                                        }
                                    });
                                },
                                // 현재 유저의 게임정보 가져옴
                                function(expCapsule, coinCapsule, nnext){
                                    var sql = "SELECT * FROM DB_USER.TB_USER_GAME WHERE idx=?";
                                    var query = connection.query(sql, uidx, function(err, userGame){
                                        logger.debug(uidx, __filename, func, query.sql);
                                        if(err){
                                            logger.error(uidx, __filename, func, err);
                                            nnext(errors.ERR_DB_QUERY);
                                        }
                                        else{
                                            if(!userGame[0]){
                                                logger.error(uidx, __filename, func, errors.ERR_USER_NOT_EXIST);
                                                nnext(errors.ERR_USER_NOT_EXIST);
                                            }
                                            else {
                                                if(!expCapsule) UpdateGameData.exp = userGame[0].exp + fish.exp + Math.floor(fish.exp*expCapsule.bData10/100);
                                                else UpdateGameData.exp = userGame[0].exp + fish.exp;
                                                if(!coinCapsule) UpdateGameData.coin = userGame[0].coin + fish.coin + Math.floor(fish.coin*coinCapsule.bData9/100);
                                                else UpdateGameData.coin = userGame[0].coin + fish.coin;
                                                if(UpdateGameData.exp >= userGame[0].total_exp) {
                                                    UpdateGameData.hook = user[0].hook;
                                                    if(gameLevel[userGame[0].level+1]){
                                                        UpdateGameData.level = userGame[0].level+1;
                                                        UpdateGameData.exp = UpdateGameData.exp = userGame[0].total_exp;
                                                        UpdateGameData.total_exp = gameLevel[UpdateGameData.level].need_exp;
                                                        if(UpdateGameData.hook < gameLevel[UpdateGameData.level].hook){
                                                            UpdateGameData.hook = gameLevel[UpdateGameData.level].hook;
                                                        }
                                                    }
                                                    else {
                                                        UpdateGameData.exp = userGame[0].total_exp;
                                                        if(UpdateGameData.hook < gameLevel[UpdateGameData.level].hook){
                                                            UpdateGameData.hook = gameLevel[UpdateGameData.level].hook;
                                                        }
                                                    }
                                                }
                                                nnext();
                                            }                                            
                                        }
                                    });
                                },
                                // 유저 게임정보 업데이트
                                function(nnext){
                                    var sql = "UPDATE DB_USER.TB_USER_GAME SET ? WHERE idx=?";
                                    var query = connection.query(sql, [UpdateGameData, uidx], function(err){
                                        logger.debug(uidx, __filename, func, query.sql);
                                        if(err){
                                            logger.error(uidx, __filename, func, err);
                                            nnext(errors.ERR_DB_QUERY);
                                        }
                                        else{
                                            nnext();
                                        }
                                    });
                                }
                            ],
                            function(err){
                                if(err){
                                    next(err);
                                }
                                else{
                                    next();
                                }
                            });
                        },
                        // 잡은 물고기 로그 남기기
                        function(next){
                            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                            var sql = "SELECT user_idx, size FROM DB_LOG.TB_LOG_USER_CAUGHT_FISH_" + shardTable + " WHERE user_idx=? AND map_idx=? AND fish_idx=?";
                            var query = connection.query(sql, [uidx, fish.location, fish.fish_idx], function(err, userFishLog){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else {
                                    if(userFishLog[0]){
                                        if(userFishLog[0].size <= fish.size){
                                            var updateData = {
                                                size: fish.size
                                            };
                                            sql = "UPDATE DB_LOG.TB_LOG_USER_CAUGHT_FiSH_" + shardTable;
                                            sql += " SET caught_count=caught_count+1, ? WHERE user_idx=? AND map_idx=? AND fish_idx=?";
                                            query = connection.query(sql, [uidx, fish.location, fish.fish_idx], function(err){
                                                logger.debug(uidx, __filename, func, query.sql);
                                                if(err){
                                                    logger.error(uidx, __filename, func, err);
                                                    next(errors.ERR_DB_QUERY);
                                                }
                                                else{
                                                    next();
                                                }
                                            });
                                        }
                                        else {
                                            sql = "UPDATE DB_LOG.TB_LOG_USER_CAUGHT_FISH_" + shardTable;
                                            sql += " SET caught_count=cought_count+1 WHERE user_idx=? AND map_idx=? AND fish_idx=?";
                                            query = connection.query(sql, [uidx, fish.location, fish.fish_idx], function(err){
                                                logger.debug(uidx, __filename, func, query.sql);
                                                if(err){
                                                    logger.error(uidx, __filename, func, err);
                                                    next(errors.ERR_DB_QUERY);
                                                }
                                                else{
                                                    next();
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        var userCaughtFishData = {
                                            user_idx: uidx,
                                            fish_idx: fish.fish_idx,
                                            grade: fish.grade,
                                            size: fish.size,
                                            caught_count: 1,
                                            map_idx: fish.location
                                        };
                                        sql = "INSERT INTO DB_LOG.TB_LOG_USER_CAUGHT_FISH_" + shardTable + " SET ?";
                                        query = connection.query(sql, userCaughtFishData, function(err){
                                            logger.debug(uidx, __filename, func, query.sql);
                                            if(err){
                                                logger.error(uidx, __filename, func, err);
                                                next(errors.ERR_DB_QUERY);
                                            }
                                            else{
                                                next();
                                            }
                                        });                                        
                                    }
                                }
                            });
                        },
                        // 월드 베스트와 비교하여 기록 갱신
                        function(next){
                            var sql = "SELECT user_idx, size FROM DB_LOG.TB_LOG_WORLD_FISH WHERE fish_idx=?";
                            var query = connection.query(sql, fish.fish_idx, function(err, worldBest){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else{
                                    if(!worldBest[0]){
                                        var newRecord = {
                                            fish_idx: fish.fish_idx,
                                            user_idx: uidx,
                                            grade: fish.grade,
                                            size: fish.size
                                        };
                                        sql = "INSERT INTO DB_LOG.TB_LOG_WORLD_FISH SET ?";
                                        query = connection.query(sql, newRecord, function(err){
                                            logger.debug(uidx, __filename, func, query.sql);
                                            if(err){
                                                logger.error(uidx, __filename, func, err);
                                                next(errors.ERR_DB_QUERY);
                                            }
                                            else{
                                                next();
                                            }
                                        });
                                    }
                                    else{
                                        if(worldBest[0].size <= fish.size){
                                            var updateRecord = {
                                                user_idx: uidx,
                                                size: fish.size
                                            };
                                            sql = "UPDATE DB_LOG.TB_LOG_WORLD_FISH SET ? WHERE fish_idx=?";
                                            query = connection.query(sql, [updateRecord, fish.fish_idx], function(err){
                                                logger.debug(uidx, __filename, func, query.sql);
                                                if(err){
                                                    logger.error(uidx, __filename, func, err);
                                                    next(errors.ERR_DB_QUERY);
                                                }
                                                else{
                                                    next();
                                                }
                                            });
                                        }
                                        else{
                                            next();
                                        }
                                    }
                                }
                            });
                        },
                        // 로그 남기기
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

module.exports = UserFishesDAO;