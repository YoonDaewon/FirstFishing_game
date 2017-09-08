var async = require('async');
var moment = require('moment');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');

function UserItemInventoriesDAO() {}

/**
 * 유저가 장착한 모든 아이템 정보 가져오기
 * 
 * @param uidx
 * @param callback
 */
UserItemInventoriesDAO.readUserEquippedItems = function(uidx, callback){
    var func = "readUserEquippedItems";

    poolCluster.getConnection(function(err,connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT idx, item_type, item_idx, reinforce, durability, count";
            sql     += " FROM DB_USER.TB_USER_ITEM_INVENTORY";
            sql     += " WHERE user_idx=? AND is_equip='y' AND deleted='n'";
            var query = connection.query(sql, uidx, function(err, userEquippedItems){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    callback(null, userEquippedItems);
                }
            });
        }
    });
};

/**
 * 유저가 보유한 모든 아이템 리스트 가져오기
 * 
 * @param uidx
 * @param callback
 */
UserItemInventoriesDAO.readUserItems = function(uidx, callback){
    var func = "readUserItems";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT idx, item_type, item_idx, count, is_equip";
            sql     += " FROM DB_USER.TB_USER_ITEM_INVENTORY";
            sql     += " WHERE user_idx=? AND deleted='n'";
            var query = connection.query(sql, uidx, function(err, userItems){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    callback(null, userItems);
                }
            });
        }
    });
};

/**
 * 인덱스를 이용하여 유저 보유 아이템 정보 가져오기
 * 
 * @param uidx
 * @param item_idx
 * @param callback
 */
UserItemInventoriesDAO.readUserItemByIdx = function(uidx, item_idx, callback){
    var func = "readUserItemByIdx";

    poolCluster.getConnection(function(err, connection){
        if(err) {
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT idx, item_type, is_equip, reinforce, durability, count";
            sql     += " FROM DB_USER.TB_USER_ITEM_INVENTORY";
            sql     += " WHERE user_idx=? AND item_idx=? AND deleted='n'";
            var query = connection.query(sql, [uidx, item_idx], function(err, userItem){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    callback(null, userItem);
                }
            });
        }
    });
}

/**
 * 아이템 판매
 * 
 * @param uidx
 * @param userItemIdx
 * @param price
 * @param callback
 */
UserItemInventoriesDAO.sellUserItem = function(uidx, userItemIdx, price, callback){
    var func = "sellUserItem";

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
                        // 아이템 판매 처리
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_ITEM_INVENTORY SET deleted='y' WHERE idx=?";
                            var query = connection.query(sql, userItemIdx, function(err){
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
                        // 재화 변경
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin+? WHERE idx=?";
                            var query = connection.query(sql, [price, uidx], function(err){
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
 * 아이템 장착
 * 
 * @param uidx
 * @param item {idx, item_type}
 * @param callback
 */
UserItemInventoriesDAO.equipItem = function(uidx, item, callback){
    var func ="equipItem";

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
                        // 장착한 Item 해제
                        function(cb){
                            var sql = "UPDATE DB_USER.TB_USER_ITEM_INVENTORY SET is_equip='n' WHERE item_type=? AND is_equip='y' AND user_idx=?";
                            var query = connection.query(sql, [item.item_type, uidx], function(err){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    cb(errors.ERR_DB_QUERY);
                                }
                                else{
                                    cb();
                                }
                            });
                        },
                        // 새로운 아이템 장착
                        function(cb){
                            var sql = "UPDATE DB_USER.TB_USER_ITEM_INVENTORY SET is_equip='y' WHERE idx=?";
                            var query = connection.query(sql, item.idx, function(err){
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

module.exports = UserItemInventoriesDAO;