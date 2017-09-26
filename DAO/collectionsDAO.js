var async = require('async');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');

function CollectionsDAO() {}

/**
 * 현재까지 잡은 모든 물고기 기록 가져오기
 * 
 * @param uidx
 * @param callback
 */
CollectionsDAO.readAllFishingLog = function(uidx, callback){
    var func = "readAllFishingLog";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
            var sql = "SELECT fish_idx, grade, size, caught_count, map_idx FROM DB_LOG.TB_LOG_USER_CAUGHT_FISH_" + shardTable;
            sql     += " WHERE user_idx=?";
            var query = connection.query(sql, uidx, function(err, fishLog){
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    if(!fishLog){
                        logger.error(uidx, __filename, func, errors.ERR_INVALID_DB_DATA);
                        callback(errors.ERR_INVALID_DB_DATA);
                    }
                    else{
                        callback(null, fishLog);
                    }
                }
            });
        }
    });
};

/**
 * 주간 잡은 물고기 기록 가져오기
 * 
 * @param uidx
 * @param callback
 */
CollectionsDAO.readWeeklyFishingLog = function(uidx, callback){
    var func = "readWeeklyFishingLog";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
            var sql = "SELECT user_idx, fish_idx FROM DB_LOG.TB_LOG_WEEKLY_CAUGHT_FISH_" + shardTable + " WHERE user_idx=?";
            var query = connection.query(sql, uidx, function(err, weeklyFishLog){
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    if()
                }
            })
        }
    })
}

module.exports = CollectionsDAO;