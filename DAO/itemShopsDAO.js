var async = require('async');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');

function ItemShopsDAO() {}

/**
 * 아이템 구매
 * 
 * @param uidx
 * @param itemInfo
 * @param callback
 */
ItemShopsDAO.buyItem = function(uidx, itemInfo, callback){
    var func = "buyItem";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.errors(uidx, __filename, func, err);
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
                        // 구매 금액 차감
                        function(next){
                            if(itemInfo.price_type === configGame.CURRENCY_TYPE.COIN){
                                var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin-? WHERE idx=?";
                                var query = connection.query(sql, [itemInfo.price, uidx], function(err){
                                    logger.debug(uidx, __filename, func, query.sql)
                                    if(err){
                                        logger.error(uidx, __filename, func, err)
                                        next(errors.ERR_DB_QUERY);
                                    }
                                    else{
                                        next();
                                    }
                                });
                            }
                            else if(itemInfo.price_type === configGame.CURRENCY_TYPE.CORAL){
                                var sql = "UPDATE DB_USER.TB_USER_GAME SET coral=coral-? WHERE idx=?";
                                var query = connection.query(sql, [itemInfo.price, uidx], function(err){
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
                        },
                        // 아이템 인벤토리에 추가
                        function(next){
                            if(itemInfo.item_type === configGame.ITEM_TYPE.REEL || itemInfo.item_type === configGame.ITEM_TYPE.ROD){                               
                                var sql = "SELECT wDurability FROM DB_GAME_DATA.TB_ITEM WHERE wRefID=?";
                                var query = connection.query(sql, itemInfo.idx, function(err, item){
                                    logger.debug(uidx, __filename, func, query.sql);
                                    if(err){
                                        logger.error(uidx, __filename, func, err);
                                        next(errors.ERR_DB_QUERY);
                                    }
                                    else{
                                        if(!item[0]){
                                            logger.error(uidx, __filename, func, errors.ERR_NOT_EXIST_ITEM);
                                            next(errors.ERR_NOT_EXIST_ITEM);
                                        }
                                        else{
                                            var newData ={
                                                user_idx: uidx,
                                                item_type: itemInfo.item_type,
                                                item_idx: itemInfo.idx,
                                                durability: item[0].wDurability
                                            }
                                            sql = "INSERT INTO DB_USER.TB_USER_TOOL_INVENTORY SET ?";
                                            query = connection.query(sql, newData, function(err){
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
                                    }
                                });
                            }
                            else{
                                var sql = "SELECT wDurability FROM DB_GAME_DATA.TB_ITEM WHERE wRefID=?";
                                var query = connection.query(sql, itemInfo.idx, function(err, item){
                                    logger.debug(uidx, __filename, func, query.sql);
                                    if(err){
                                        logger.error(uidx, __filename, func, err);
                                        next(errors.ERR_DB_QUERY);
                                    }
                                    else{
                                        if(!item[0]){
                                            logger.error(uidx, __filename, func, errors.ERR_NOT_EXIST_ITEM);
                                            next(errors.ERR_NOT_EXIST_ITEM);
                                        }
                                        else {
                                            var newData = {
                                                user_idx: uidx,
                                                item_type: itemInfo.item_idx,
                                                item_idx: itemInfo.idx,
                                                count: item[0].wDurability
                                            };
                                            sql = "INSERT INTO DB_USER.TB_USER_ITEM_INVENTORY SET ?";
                                            query = connection.query(sql, newData, function(err){
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
                                    }
                                });                                
                            }
                        },
                        // 아이템 구매 로그 작성
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



module.exports = ItemShopsDAO;