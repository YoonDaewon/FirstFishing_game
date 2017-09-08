var async = require('async');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');

function UserToolInventoriesDAO() {}

/**
 * 유저가 보유하고 있는 낚시 도구 가져오기
 * 
 * @param uidx
 * @param callback
 */
UserToolInventoriesDAO.readUserTools = function(uidx, callback){
    var func = "readUserTools";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            var sql = "SELECT idx AS user_item_idx, item_type, item_idx, is_equip, reinforce, durability";
            sql     += " FROM DB_USER.TB_USER_TOOL_INVENTORY";
            sql     += " WHERE user_idx=? AND deleted='n'";
            var query = connection.query(sql, uidx, function(err, userTools){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    callback(null, userTools);
                }
            });
        }
    });
};

/**
 *  유저가 장착한 낚시 도구 가져오기
 * 
 * @param uidx
 * @param callback
 */
UserToolInventoriesDAO.readUserEquippedTools = function(uidx, callback){
    var func = "readUserEquippedTools";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.debug(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT idx, item_type, item_idx, reinforce, durability";
            sql     += " FROM DB_USER.TB_USER_TOOL_INVENTORY";
            sql     += " WHERE user_idx=? AND is_equip='y' AND deleted='n'";
            var query = connection.query(sql, uidx, function(err, userEquippedTools){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    callback(null, userEquippedTools);
                }
            });
        }
    });
};

/**
 * 아이템 강화
 * 
 * @param uidx
 * @param userItem  {idx, coin, pearl}
 * @param callback
 */
 UserToolInventoriesDAO.reinforceTool = function(uidx, userItem, callback){
     var func = "reinforceTool";

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
                         // 아이템 강화수치 상승처리
                         function(next){
                             var sql = "UPDATE DB_USER.TB_USER_TOOL_INVENTORY SET reinforce=reinforce+1 WHERE idx=?";
                             var query = connection.query(sql, userItem.idx, function(err){
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
                         // 골드 차감
                         function(next){
                             var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin-?, pearl=pearl-? WHERE idx=?";
                             var query = connection.query(sql, [userItem.coin, userItem.pearl, userItem.idx], function(err){
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
                     ],
                    function(err, result){
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
 *  낚시 도구 사용. hook 차감 및 내구도 감소
 * 
 * @param uidx
 * @param callback
 */
UserToolInventoriesDAO.useFishingTool = function(uidx, callback){
    var func ="useFishingTool";

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
                        // 바늘 차감
                        function(next){
                            var sql = "SELECT level, hook FROM DB_USER.TB_USER_GAME WHERE idx=?";
                            var query = connection.query(sql, uidx, function(err, userGame){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    callback(errors.ERR_DB_QUERY);
                                }
                                else {
                                    if(userGame[0]){
                                        var max_hook = configGame.SERVER_ENV.HOOK_COUNT + Math.floor(userGame[0].level/10);
                                        if(userGame[0].hook === max_hook)
                                            sql = "UPDATE DB_USER.TB_USER_GAME SET hook=hook-1, hook_charged_time=NOW() WHERE idx=?";
                                        else
                                            sql = "UPDATE DB_USER.TB_USER_GAME SET hook=hook-1 WHERE idx=?";
                                        query = connection.query(sql, uidx, function(err){
                                            logger.debug(uidx, __filename, func, query.sql);
                                            if(err){
                                                logger.error(uidx, __filename, func, err);
                                                next(errors.ERR_DB_QUERY);
                                            }
                                            else {
                                                next();
                                            }
                                        });
                                    } 
                                    else {
                                        logger.error(uidx, __filename, func, errors.ERR_USER_NOT_EXIST);
                                        callback(errors.ERR_USER_NOT_EXIST);
                                    }
                                }
                            });
                        },
                        // 낚시 Tool 내구도 감소
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_TOOL_INVENTORY SET durability=durability-1";
                            sql     += " WHERE user_idx=? AND is_equip='y' AND durability > 0";
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
                        // 낚시 Item 개수 감소
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_ITEM_INVENTORY SET count=count-1";
                            sql     += " WHERE user_idx=? AND is_equip='y' AND count > 0";
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
 *  재도전에 따른 hook, 내구도, 갯수, 재화 차감
 * 
 * @param uidx
 * @param callback
 */
UserToolInventoriesDAO.useRetryFishingTool = function(uidx, callback){
    var func = "useRetryFishingTool";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            async.parallel([
                // 바늘 차감
                // 재도전 비용 차감
                function(next){
                    var sql = "SELECT level, hook FROM DB_USER.TB_USER_GAME WHERE idx=?";
                    var query = connection.query(sql, uidx, function(err, userGame){
                        logger.debug(uidx, __filename, func, query.sql);
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(errors.ERR_DB_QUERY);
                        }
                        else {
                            if(userGame[0]){
                                var max_hook = configGame.SERVER_ENV.HOOK_COUNT + Math.floor(userGame[0].level/10);
                                if(userGame[0].hook === max_hook)
                                    sql = "UPDATE DB_USER.TB_USER_GAME SET hook=hook-1, coral=coral-?, hook_charged_time=NOW() WHERE idx=?";
                                else
                                    sql = "UPDATE DB_USER.TB_USER_GAME SET hook=hook-1, coral=coral-? WHERE idx=?";
                                query = connection.query(sql, [configGame.SERVER_ENV.RETRY_CURRENCY, uidx], function(err){
                                    logger.debug(uidx, __filename, func, query.sql);
                                    if(err){
                                        logger.error(uidx, __filename, func, err);
                                        next(errors.ERR_DB_QUERY);
                                    }
                                    else {
                                        next();
                                    }                                    
                                });
                            }
                            else {
                                logger.error(uidx, __filename, func, errors.ERR_USER_NOT_EXIST);
                                next(errors.ERR_USER_NOT_EXIST);
                            }
                        }
                    });
                },
                // 낚시 Tool 내구도 감소
                function(next){
                    var sql = "UPDATE DB_USER.TB_USER_TOOL_INVENTORY SET durability=durability-1";
                    sql     += " WHERE idx=? AND is_equip='y' AND durability>0";
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
                // 낚시 Item 갯수 감소
                function(next){
                    var sql = "UPDATE DB_USER.TB_USER_ITEM_INVENTORY SET count=count-1";
                    sql     += " WHERE idx=? AND is_equip='y' AND count>0";
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
                }
            ],
            function(err){
                connection.release();
                if(err){
                    callback(err);
                }
                else {
                    callback();
                }
            });
        }
    });
};

/**
 * 도구 판매
 * 
 * @param uidx
 * @param userToolIdx
 * @param price
 * @param callback
 */
UserToolInventoriesDAO.sellUserTool = function(uidx, userToolIdx, price, callback){
    var func = "sellUserTool";

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
                else {
                    async.parallel([
                        // Tool 삭제 처리
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_TOOL_INVENTORY SET is_equip='n', deleted='y'";
                            sql     += " WHERE idx=? AND user_idx=?";
                            var query = connection.query(sql, [userToolIdx, uidx], function(err){
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
                        // 아이템 판매 금액 더하기
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin+? WHERE idx=?";
                            var query = connection.query(sql, [price, uidx], function(err){
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
 * 내구도 수리
 * 
 * @param uidx
 * @param userToolIdx
 * @param price
 * @param callback
 */
UserToolInventoriesDAO.repairUserTool = function(uidx, userToolIdx, price, callback){
    var func ="repairUserTool";

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
                else{
                    async.parallel([
                        // 내구도 충전
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_TOOL_INVENTORY SET durability=? WHERE idx=? AND user_idx=?";
                            var query = connection.query(sql, [configGame.SERVER_ENV.MAX_DURABILITY, userToolIdx, uidx], function(err){
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
                        // Coin 삭감
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin-? WHERE idx=?";
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
 * Tool 장착
 * 
 * @param uidx
 * @param tool      {idx, item_type}
 * @param callback
 */
UserToolInventoriesDAO.toolEquip = function(uidx, tool, callback){
    var func = "toolEquip";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(udxi, __filename, func, err)
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            connection.beginTransaction(function(err){
                if(err){
                    connection.release();
                    loggerl.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_TRANSACTION);
                }
                else{
                    async.waterfall([
                        // 현재 장착하고 있는 Tool 해제
                        function(cb){
                            var sql = "UPDATE DB_USER.TB_USER_TOOL_INVENTORY SET is_equip='n' WHERE user_idx=? AND is_equip='y' AND item_type=?";
                            var query = connection.query(sql, [uidx, tool.item_type], function(err){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    cb(errors.ERR_DB_QUERY);
                                }
                                else {
                                    cb();
                                }
                            });
                        },
                        // 새로운 Tool 장착
                        function(cb){
                            var sql = "UPDATE DB_USER.TB_USER_TOOL_INVENTORY SET is_equip='y' WHERE idx=?";
                            var query = connection.query(sql, tool.idx, function(err){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    cb(errors.ERR_DB_QUERY);
                                }
                                else{
                                    cb();
                                }
                            });
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

module.exports = UserToolInventoriesDAO;