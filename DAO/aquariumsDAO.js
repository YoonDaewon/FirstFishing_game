var async = require('async');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');

function AquariumsDAO() {}

/**
 * 해당 수조 정보 가져오기
 * 
 * @param uidx
 * @param aquariumIdx
 * @param callback
 */
AquariumsDAO.readAquariumByIdx = function(uidx, aquariumIdx, callback){
    var func = "readAquariumByIdx";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            var sql = "SELECT idx, price_type, buy_cost, slot_0, slot_1, slot_2, slot_3, slot_4, slot_5,";
            sql     += " price_1, price_2, price_3, price_4, price_5, set_1, set_1, set_2, set_3,";
            sql     += " set_reward_time, set_reward_item, set_reward_count, growth_time";
            sql     += " FROM DB_GAME_DATA.TB_AQUARIUM WHERE idx=?";
            var query = connection.query(sql, aquariumIdx, function(err, aquarium){
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    if(!aquarium[0]){
                        logger.error(uidx, __filename, func, errors.ERR_NOT_EXIST_AQUARIUM);
                        callback(errors.ERR_NOT_EXIST_AQUARIUM);
                    }
                    else{
                        callback(null, aquarium[0]);
                    }
                }
            });
        }
    });
};

/**
 *  현재 확장 정도에 따른 비용 가져오기
 * 
 * @param uidx
 * @param aquariumIdx
 * @param aquariumExtend
 * @param callback
 */
AquariumsDAO.readExtendCost = function(uidx, aquariumIdx, aquariumExtend, callback){
    var func = "readExtendCost";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            var extend = aquariumExtend + 1;
            var sql = "SELECT price_" + extend + " AS price FROM DB_GAME_DATA.TB_AQUARIUM WHERE idx=?";
            var query = connection.query(sql, aquariumIdx, function(err, extend_price){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    callback(null, extend_price[0]);
                }
            });
        }
    });
};

module.exports = AquariumsDAO;