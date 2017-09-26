var async = require('async');
var moment = require('moment');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');
var config = require('../config/ConfigGame');

function UserWaterTanksDAO() {}

/**
 * 유저가 보유한 모든 물고기 가져오기
 * 
 * @param uidx
 * @param callback
 */
UserWaterTanksDAO.readUserFishes = function(uidx, callback){
    var func = "readUserFishes";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
            var sql = "SELECT idx, user_aquarium_idx, fish_idx, size, location, buff_coim, is_lock, is_set, max_time";
            sql     += " FROM DB_USER.TB_USER_FISH_TANK_" + shardTable;
            sql     += " WHERE user_idx=? AND deleted='n'";
            var query = connection.query(sql, uidx, function(err, userFishes){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    callback(null, userFishes);
                }
            });
        }
    });
};

/**
 * 해당 물고기 구체적 정보 가져오기
 * 
 * @param uidx
 * @param userFishTankIdx
 * @param callback
 */
UserWaterTanksDAO.readUserFishInfoByIdx = function(uidx, userFishTankIdx, callback){
    var func = "readUserFishInfoByIdx";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
            var sql = "SELECT A.idx, A.user_aquarium_idx, A.fish_idx, A.size, A.location, A.buff_coin, A.is_lock, A.is_set,";
            sql     += " IF(FLOOR(TIME_TO_SEC(TIMEDIFF(A.max_time, NOW()))) < 0, 0, FLOOR(TIME_TO_SEC(TIMEDIFF(A.max_time, NOW())))) AS diff_time,";
            sql     += " B.nCoin, B.maxGrowthCoin, C.maxFishGrowthTime";
            sql     += " FROM DB_USER.TB_USER_FISH_TANK_" + shardTable + " A, DB_GAME_DATA.TB_FISH B, DB_GAME_DATA.TB_FISHTANK C";
            sql     += " WHERE A.idx=? AND A.user_idx=? AND deleted='n' AND B.wRefID=A.fish_idx AND C.wRefID = A.user_aquarium_idx";
            var query = connection.query(sql,[userFishTankIdx, uidx], function(err, userFish){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    if(!userFish[0]){
                        logger.error(uidx, __filename, func, errors.ERR_USER_FISH_NOT_EXIST);
                        callback(errors.ERR_USER_FISH_NOT_EXIST);
                    }
                    else {
                        callback(null, userFish[0]);
                    }
                }
            });
        }
    });
};

/**
 * 수조 안에 들어있는 물고기 리스트 가져오기
 * 
 * @param uidx
 * @param userAquariumIdx
 * @param callback
 */
UserWaterTanksDAO.readUserFishesByUserAquarium = function(uidx, userAquariumIdx, callback){
    var func = "readUserFishesByUserAquarium";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
            var sql = "SELECT idx, fish_idx, size, location, growth_coin, buff_coin, is_lock, is_set, catched_time, growth_time";
            sql     += " FROM DB_USER.TB_USER_FISH_TANK_" + shardTable;
            sql     += " WHERE user_idx=? AND user_aquarium_idx=? AND deleted='n'";
            var query = connection.query(sql, [uidx, userAquariumIdx], function(err, userAquariumFishes){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    callback(null, userAquariumFishes);
                }
            });            
        }        
    });
};

/**
 * 수조안의 최대 사이즈에 도달한 물고기 개수 가져오기 (모든 수조)
 * 
 * @param uidx
 * @param callback
 */
UserWaterTanksDAO.readMaxSizeFishCount = function(uidx, callback){
    var func = "readMaxSizeFishCount";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
            var sql = "SELECT COUNT(idx) AS cnt FROM DB_USER.TB_USER_FISH_TANK_" + shardTable;
            sql     += " WHERE user_idx=? AND deleted='n' AND max_time <= NOW()";
            var query = connection.query(sql, uidx, function(err, maxSizeFish){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    if(maxSizeFish[0]){
                        callback(null, maxSizeFish[0].cnt);
                    }
                    else {
                        callback(null, 0);
                    }
                }
            });
        }
    });
};

/**
 * 수조별 최대 사이즈 물고기 마리수 가져오기
 * 
 * @param uidx
 * @param callback
 */
UserWaterTanksDAO.readMaxSizeFishCountPerAquarium = function(uidx, callback){
    var func = "readMaxSizeFishCountPerAquarium";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
            var sql = "SELECT user_aquarium_idx, COUNT(idx) AS max_count FROM DB_USER.TB_USER_FISH_TANK_" + shardTable;
            sql     += " WHERE user_idx=? AND deleted='n' AND max_time <= NOW()";
            sql     += " GROUP BY user_aquarium_idx";
            var query = connection.query(sql, uidx, function(err, maxSizeFishes){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    callback(null, maxSizeFishes);
                }
            });
        }
    });
};

/**
 * 해당 물고기 판매
 * 
 * @param uidx
 * @param userFish
 * @param callback
 */
UserWaterTanksDAO.sellFishByUserFishIdx = function(uidx, userFish, callback){
    var func = "sellFishByUserFishIdx";

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
                    var coin = 0;
                    if(userFish.diff_time > 0){
                        var growth_coin = userFish.maxGrowthCoin - Math.floor((userFish.maxGrowthCoin - userFish.nCoin)*(userFish.diff_time/userFish.maxFishGrowthTime));
                        coin = growth_coin + userFish.buff_coin;
                    }
                    else {
                        coin = userFish.maxGrowthCoin;
                    }
                    async.parallel([
                        // 코인 증가 
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin+? WHERE idx=?";
                            var query = connection.query(sql, [coin, uidx], function(err){
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
                        // 물고기 삭제
                        function(next){
                            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                            var sql = "UPDATE DB_USER.DB_USER_FISH_TANK_" + shardTable + " SET deleted='y' WHERE idx=?";
                            var query = connection.query(sql, uidx, function(err){
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
                        // 수조 안의 물고기 숫자 하나 줄이기
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_AQUARIUM SET cur_count=cur_count-1 WHERE idx=?";
                            var query = connection.query(sql, userFish.user_aquarium_idx, function(err){
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
                        // 통화량 변화 로그 남기기
                        function(next){
                            // 아직 미구현
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

/**
 * 해당 수조 안의 MAX 물고기 모두 팔기
 * 
 * @param uidx
 * @param userAquariumIdx
 * @param callback
 */
UserWaterTanksDAO.sellMaxSizeFishes = function(uidx, userAquariumIdx, callback){
    var func = "sellMaxSizeFishes";

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
                    async.waterfall([
                        function(cb){
                            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                            var sql = "SELECT A.idx, A.user_aquarium_idx, A.fish_idx, A.buff_coin, A.is_lock,";
                            sql     += " B.maxGrowthCoin";
                            sql     += " FROM DB_USER.TB_USER_FISH_TANK_" + shardTable + " A, DB_GAME_DATA.TB_FISH B";
                            sql     += " WHERE A.user_aquarium_idx=? AND A.user_idx=? AND A.deleted='n' AND A.max_time <= NOW() AND A.fish_idx=B.wRefID";
                            var query = connection.query(sql, [userAquariumIdx, uidx], function(err, userFishes){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    cb(errors.ERR_DB_QUERY);
                                }
                                else {
                                    cb(null, userFishes);
                                }
                            });
                        },
                        function(userFishes, cb){
                            var coin = 0;
                            if(userFishes.length > 0){
                                var userFishArray = new Array;
                                // 물고기들 가격 합산
                                for(var i in userFishes){
                                    userFishArray.push(userFishes[i].idx);
                                    coin += (userFishes[i].maxGrowthCoin + userFishes[i].buff_coin);
                                }
                                async.parallel([
                                    // 골드 업데이트
                                    function(next){
                                        var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin+? WHERE idx=?";
                                        var query = connection.query(sql, [coin, uidx], function(err){
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
                                    // 물고기 삭제
                                    function(next){
                                        var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                                        var sql = "UPDATE DB_USER.TB_FISH_TANK_" + shardTable + " SET deleted='y' WHERE idx IN (" + userFishArray + ")";
                                        var query = connection.query(sql, function(err){
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
                                    // 수족관 물고기 숫자 줄이기
                                    function(next){
                                        var sql = "UPDATE DB_USER.TB_USER_AQUARIUM SET cur_count=cur_count-? WHERE idx=?";
                                        var query = connection.query(sql, [userFishes.length, userAquariumIdx], function(err){
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
                                    // 로그 남기기
                                    function(next){
                                        next();
                                    }
                                ],
                            function(err){
                                if(err){
                                    cb(err);
                                }
                                else{
                                    cb();
                                }
                            });
                            }
                            else{
                                cb();
                            }
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

/**
 * 물고기 수조 이동하기
 * 
 * @param uidx
 * @param userFish
 * @param aquariumData
 * @param callback
 */
UserWaterTanksDAO.moveAquarium = function(uidx, userFish, aquariumData, callback){
    var func = "moveAquarium";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            var left_time = 0;
            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);

            if(userFIsh.diff_time > 0){
                left_time = parseInt((userFish.diff_time / aquariumData.oldGrowthTime) * aquariumData.newGrowthTime);             
            }

            var sql = "UPDATE DB_USER.TB_USER_FISH_TANK_" + shardTable + " SET max_time=(NOW()+ INTERVAL ? SECOND), user_aquarium_idx=? WHERE idx=?";
            var query = connection.query(sql, [left_time, aquariumData.newIdx, userFish.idx], function(err){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    callback();
                }                
            });
        }
    });
};

/**
 * 
 * 잡은 물고기 수조에 넣기
 * 
 * @param uidx
 * @param fish
 * @param userAquarium
 * @param callback
 */
UserWaterTanksDAO.putFishIntoAquarium = function(uidx, fish, userAquarium, callback){
    var func = "putFishIntoAquarium";

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
                        function(next){
                            var updateGameData = {};
                            async.waterfall([
                                // 장착한 경험치 캡슐 옵션 적용
                                function(nnext){
                                    var sql = "SELECT B.bData10 FROM DB_USER.TB_USER_ITEM_INVENTORY A, DB_GAME_DATA.TB_ITEM B";
                                    sql     += " WHERE A.user_idx=? AND A.item_type=? AND is_equip='y' AND A.item_idx=B.wRefID";
                                    var query = connection.query(sql, [uidx, config.ITEM_TYPE.CAPSULE_EXP], function(err, userCapsule){
                                        logger.debug(uidx, __filename, func, query.sql);
                                        if(err){
                                            logger.error(uidx, __filename, func, err);
                                            nnext(err);
                                        }
                                        else{
                                            nnext(null, userCapsule[0]);                                  
                                        }
                                    });                                                                      
                                },
                                // 현재 유저 게임정보 가져오기
                                function(userCapsule, nnext){
                                    var sql = "SELECT * FROM DB_USER.TB_USER_GAME WHERE idx=?";
                                    var query = connection.query(sql, uidx, function(err, userGame){
                                        logger.debug(uidx, __filename, func, query.sql);
                                        if(err){
                                            logger.error(uidx, __filename, func, err);
                                            nnext(err);
                                        }
                                        else {
                                            if(!userGame[0]){
                                                logger.error(uidx, __filename, func, errors.ERR_USER_NOT_EXIST);
                                                nnext(errors.ERR_USER_NOT_EXIST);
                                            }
                                            else{
                                                if(!userCapsule) updateGameData.exp = userGame[0].exp + fish.exp + Math.floor(fish.exp*userCapsule.bData10/100);
                                                else updateGameData.exp = userGame[0].exp + fish.exp;
                                                if(updateGameData.exp >= userGame[0].total_exp){
                                                    updateGameData.hook = userGame[0].hook;
                                                    // 만랩이 아니면 레벨업, 아니면 경험치 및 hook만 채워줌
                                                    if(gameLevel[userGame[0].level+1]){
                                                        updateGameData.level = userGame[0].level+1;
                                                        updateGameData.exp = updateGameData.exp-userGame[0].total_exp;
                                                        updateGameData.total_exp = gameLevel[updateGameData.level].need_exp;
                                                        if(updateGameData.hook < gameLevel[updateGameData.level].hook){
                                                            updateGameData.hook = gameLevel[updateGameData.level].hook;
                                                        }
                                                    }
                                                    else{
                                                        updateGameData.exp = userGame[0].total_exp;
                                                        if(updateGameData.hook < gameLevel[updateGameData.level].hook){
                                                            updateGameData.hook = gameLevel[updateGameData.level].hook;
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
                                    var query = connection.query(sql, [updateGameData, uidx], function(err){
                                        logger.debug(uidx, __filename, func, query.sql);
                                        if(err){
                                            logger.error(uidx, __filename, func, err);
                                            nnext(err);
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
                        // 수조에 물고기 넣기
                        function(next){
                            var newData ={
                                user_idx: uidx,
                                user_aquarium_idx: userAquariumIdx.idx,
                                fish_idx: fish.fish_idx,
                                size: fish.size,
                                location: fish.map_idx
                            };
                            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                            var sql = "INSERT INTO DB_USER.TB_FISH_TANK_" + shardTable + "SET ?, max_time=(NOW()+ INTERVAL ? SECOND), created=NOW()";
                            var query = connection.query(sql, [newData, userAquarium.grow_time], function(err){
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
                        // 수조에 들어 있는 물고기 수 증가
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_AQUARIUM SET cur_count=cur_count+1 WHERE idx=?";
                            var query = connection.query(sql, userAquarium.idx, function(err){
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
                        // 잡은 물고기 로그 남기기
                        function(next){
                            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                            var sql = "SELECT * FROM DB_LOG.TB_LOG_USER_CAUGHT_FISH_" + shardTable;
                            sql     += " WHERE user_idx=? AND map_idx=? AND fish_idx=?";
                            var query = connection.query(sql, [uidx, fish.map_idx, fish.fish_idx], function(err, userFishLog){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else{
                                    if(userFishLog[0]){
                                        if(userFishLog[0].size <= fish.size){
                                            var updateData = {
                                                size: fish.size
                                            };
                                            sql = "UPDATE DB_LOG.TB_LOG_USER_CAUGHT_FISH_" + shardTable;
                                            sql += " SET caught_count=caught_count+1, ? WHERE user_idx=? AND map_idx=? AND fish_idx=?";
                                            query = connection.query(sql, [updateData, uidx, fish.map_idx, fish.fish_idx], function(err){
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
                                            sql = "UPDATE DB_LOG.TB_LOG_USER_CAUGHT_FISH_" + shardTable;
                                            sql += " SET caught_count=caught_count+1 WHERE user_idx=? AND map_idx=? AND fish_idx=?";
                                            query = connection.query(sql, [uidx, fish.map_idx, fish.fish_idx], function(err){
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
                                    else{
                                        var userCaughtFishData = {
                                            user_idx: uidx,
                                            fish_idx: fish.fish_idx,
                                            grade: fish.grade,
                                            size: fish.size,
                                            caught_count: 1,
                                            map_idx: fish.map_idx
                                        };
                                        sql = "INSERT INTO DB_LOG.TB_LOG_USER_CAUGHT_FISH_" + shardTable + " SET ?, created=NOW()";
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
                        // 월드 최고 물고기와 비교 후 크다면 월드 베스트 갱신
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
                                            user_idx: uidx,
                                            fish_idx: fish.fish_idx,
                                            grade: fish.grade,
                                            size: fish.size
                                        };
                                        sql = "INSERT INTO DB_LOG.TB_LOG_WORLD_FISH SET ?, created=NOW()";
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
                                                logger.debug(uidx, __filename, func, err);
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
                                }
                            });
                        },
                        // 로그 남기기
                        function(next){
                            var logData = {
                                uidx: uidx,
                                fish_idx: fish.fish_idx,
                                grade: fish.grade,
                                size: fish.size,
                                map_idx: fish.map_idx,
                                type: "CAUGHT_FISH"
                            };
                            logger.info(uidx, __filename, func, logData);
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

module.exports = UserWaterTanksDAO;