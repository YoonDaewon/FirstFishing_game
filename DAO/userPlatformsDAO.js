var async               = require('async');
var moment              = require('moment');

var poolCluster         = require('../lib/MySQLPoolCluster').PoolCluster;

var errors              = require('../message/errors');

function UserPlatFormsDAO() {}

/**
 * 유저 인덱스를 이용하여 플랫폼 정보 검색
 * 
 * @param uidx
 * @param callback
 */
UserPlatFormsDAO.ReadUserPlatformByUIdx = function(uidx, callback) {
    var func = "ReadUserPlatformByUIdx";
    poolCluster.getConnection(function(err, connection) {
        if(err) {
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT IFNULL(pf_name, '') AS pf_name, IFNULL(pf_img, '') AS pf_img";
            sql     += " FROM DB_USER.TB_USER_PLATFORM WHERE user_idx=? AND deleted='n' ORDER BY idx DESC";
            var query = connection.query(sql, uidx, function(err, userPlatform) {
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err) {
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    callback(null, userPlatform[0]);
                }
            });            
        }
    });
};

/**
 * 플랫폼 정보를 이용하여 유저 정보 가져오기
 * 
 * @param id
 * @param platform
 * @param platformID
 * @param callback
 */
UserPlatFormsDAO.ReadUserIdxByPlatformID = function(id, platform, platformID, callback) {
    var func = "ReadUserPlatformByPlatformID";
    poolCluster.getConnection(function(err, connection){
        if(err) {
            logger.error(id, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT user_idx AS idx";
            sql    += " FROM DB_USER.TB_USER_PLATFORM WHERE platform=? AND platform_id=? AND deleted='n'";
            var query = connection.query(sql, [platform, platformID], function(err, userPlatform){
                connection.release();
                logger.debug(id, __filename, func, query.sql);
                if(err) {
                    logger.error(id, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    callback(null, userPlatform[0]);
                }
            });
        }
    });
};

module.exports = UserPlatFormsDAO;