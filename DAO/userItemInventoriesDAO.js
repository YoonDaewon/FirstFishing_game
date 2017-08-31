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
            var sql = "SELECT idx, item_type, item_idx, reinforce, durability, count, is_equip";
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

module.exports = UserItemInventoriesDAO;