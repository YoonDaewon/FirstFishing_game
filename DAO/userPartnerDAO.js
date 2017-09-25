var async = require('async');
var moment = require('moment');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');
var config = require('../config/ConfigGame');

function UserPartnerDAO() {}

/**
 * 파트너 정보 불러오기
 * 
 * @param uidx
 * @param callback
 */
UserPartnerDAO.readPartnerInfo = function(uidx, callback){
    var func = "readPartnerInfo";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{       
            var sql = "SELECT idx, name, level, exp, max_exp, skill_1, skill_2, skill_3, skill_4, skill_5, skill_6, skill_7, skill_8";
            sql     += " FROM DB_USER.TB_USER_PARTNER WHERE user_idx=?";
            var query = connection.query(sql, uidx, function(err, partnerInfo){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    callback(null, partnerInfo);
                }
            });
        }
    });
};

/**
 * 파트너 의상 리스트 가져오기
 * 
 * @param uidx
 * @param callback
 */
UserPartnerDAO.readPartnerDress = function(uidx, callback){
    var func = "readPartnerDress";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT idx, partner_idx, dress_idx, equip FROM DB_USER.TB_USER_PARTNER_DRESS WHERE user_idx=?";
            var query = connection.query(sql, uidx, function(err, dressInfo){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else{
                    callback(null, dressInfo);
                }
            });
        }
    });
};

/** 
 * 파트너 스킬 레벨업
 * 
 * @param uidx
 * @param skillIdx
 * @param price
 * @param callback
 */
UserPartnerDAO.partnerSkillUp = function(uidx, skillIdx, price, callback){
    var func = "partnerSkillUp";

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
                        // 스킬 레벨업
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_PARTNER SET ";
                            sql     += "skill_" + skillIdx + "=skill_" + skillIdx + "+1 WHERE user_idx=?";
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
                        // coin 감소
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin-? WHERE idx=?";
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
                        else{
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
 * 파트너 의상 변경
 * 
 * @param uidx
 * @param partnerIdx
 * @param dressIdx
 * @param callback
 */
UserPartnerDAO.changeDress = function(uidx, partnerIdx, dressIdx, callback){
    var func = "changeDress";

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
                        // 장착하고 있는 의상 해제
                        function(cb){
                            var sql = "UPDATE DB_USER.TB_USER_PARTNER_DRESS SET equip='n' WHERE partner_idx=? AND equip='y'";
                            var query = connection.query(sql, partnerIdx, function(err){
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
                        // 새로운 의상 착용
                        function(cb){
                            var sql = "UPDATE DB_USER.TB_USER_PARTNER_DRESS SET equip='y' WHERE partner_idx=? AND dress_idx=?";
                            var query = connection.query(sql, [partnerIdx, dressIdx], function(err){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    cb(errors.ERR_DB_QUERY);
                                }
                                else {
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

/**
 * 파트너 호감도 상승
 * 
 * @param uidx
 * @param partnerIdx
 * @param exp
 * @param callback
 */
UserPartnerDAO.increaseExp = function(uidx, partnerIdx, exp, callback){
    var func = "increaseExp";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            async.waterfall([
                // 파트너 정보 불러오기
                function(callback){
                    var sql = "SELECT level, exp, max_exp FROM DB_USER.TB_USER_PARTNER WHERE idx=?";
                    var query = connection.query(sql, partnerIdx, function(err, partnerInfo){
                        logger.debug(uidx, __filename, func, query.sql);
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            callback(errors.ERR_DB_QUERY);
                        }
                        else {
                            if(!partnerInfo[0]){
                                logger.error(uidx, __filename, func, err);
                                callback(errors.ERR_NOT_EXIST_PARTNER);
                            }
                            else {
                                callback(null, partnerInfo[0]);
                            }
                        }
                    });
                },
                // 레벨 및 경험치 계산
                function(partnerInfo, callback){
                    var updateData = {};
                    
                    updateData.level = partnerInfo.level;
                    updateData.exp = partnerInfo.exp + exp;
                    while( updateData.exp >= partnerLevel[updateData.level].need_exp){
                        if(updateData.level != 100){
                            updateData.exp = updateData.exp - partnerLevel[updateData.level].need_exp;
                            updateData.level++;
                            updateData.max_exp = partnerLevel[updateData.level].need_exp;
                        }
                        else{
                            updateData.exp = 0;
                        }                        
                    }
                    callback(null, updateData);
                },
                // 레벨 및 경험치 변경 
                function(updateData, callback){
                    var sql = "UPDATE DB_USER.TB_USER_PARTNER SET ? WHERE idx=?";
                    var query = connection.query(sql, [updateData, partnerIdx], function(err){
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
            ],
            function(err){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    callback();
                }
            });
        }
    });
};

module.exports = UserPartnerDAO;