var async = require('async');
var moment = require('moment');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');

function UsersDAO() { }

/**
 * DB연동 테스트
 *
 * @param uidx
 * @param callback
 */
UsersDAO.connectDB = function (uidx, callback) {
    var func = "connectDB";

    poolCluster.getConnection(function (err, connection) {
        if (err) {
            res.send('DB connection Error');
        } else {
            var sql = "SELECT *";
            sql += " FROM test.user";
            sql += " WHERE idx=?";
            var query = connection.query(sql, [uidx], function (err, user) {
                connection.release();
                if (err) {
                    res.send('Select fail');
                } else {
                    callback(null, user[0]);
                }
            });
        }
    });
};

/**
 * TB_USER에서 idx를 검색
 *
 * @param id
 * @param callback
 */
UsersDAO.readUserIdxFromTB_USER = function (id, platform, callback) {
    var func = "readUserIdxFromTB_USER";

    poolCluster.getConnection(function (err, connection) {
        if (err) {
            logger.error("ID : " + id, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT idx FROM DB_USER.TB_USER WHERE id=? AND platform=? AND block='n'";
            var query = connection.query(sql, [id, platform], function (err, user) {
                connection.release();
                logger.debug(id, __filename, func, query.sql);
                if (err) {
                    logger.error(id, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    callback(null, user[0]);
                }
            });
        }
    });
};

/**
 * TB_DEVICE에 devicID 존재 여부 및 로그인 여부 체크
 * 
 * @param id
 * @param callback
 */
UsersDAO.readUserIdxByDeviceID = function (id, callback) {
    var func = "readUserIdxByDeviceID";

    poolCluster.getConnection(function (err, connection) {
        if (err) {
            logger.error("ID : " + id, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT user_idx FROM DB_USER.TB_DEVICE WHERE id=? AND link='y'";
            var query = connection.query(sql, id, function (err, user) {
                connection.release();
                logger.debug(id, __filename, func, query.sql);
                if (err) {
                    logger.error(id, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    callback(null, user[0]);
                }
            });
        }
    });
};

/**
 *  계정 생성
 * @param newData
 * @param callback
 */
UsersDAO.createUser = function (newData, callback) {
    var func = "CreateUser";
    var id = newData.id;

    poolCluster.getConnection(function (err, connection) {
        if (err) {
            logger.error(id, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            connection.beginTransaction(function (err) {
                if (err) {
                    connection.release();
                    logger.error(id, __filename, func, err);
                    callback(errors.ERR_DB_TRANSACTION);
                }
                else {
                    async.waterfall([
                        function (next) {
                            // TB_USER에 등록, idx 반환
                            var UserData = {
                                id: newData.id,
                                platform: newData.platform,
                                lang: newData.lang
                            };
                            var sql = "INSERT INTO DB_USER.TB_USER SET ?";
                            var query = connection.query(sql, UserData, function (err, result) {
                                logger.debug(id, __filename, func, query.sql);
                                if (err) {
                                    logger.error(id, __filename, finc, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else {
                                    next(null, result.insertId);
                                }
                            });
                        },
                        function (userIdx, next) {
                            async.parallel([
                                function (cb) {
                                    // TB_ DEVICE에 등록
                                    var DeviceData = {
                                        user_idx: userIdx,
                                        id: newData.id,
                                        platform: newData.platform,
                                        link: "y"
                                    }
                                    var sql = "INSERT INTO DB_USER.TB_DEVICE SET ?";
                                    var query = connection.query(sql, DeviceData, function (err) {
                                        logger.debug(id, __filename, func, query.sql);
                                        if (err) {
                                            logger.error(userIdx, __filename, func, err);
                                            cb(err);
                                        }
                                        else {
                                            cb();
                                        }
                                    });
                                },
                                function (cb) {
                                    // TB_USER_PLATFORM 에 등록
                                    var PlatformData = {
                                        user_idx: userIdx,
                                        platform: newData.platform
                                    };

                                    if (newData.platform == "guest") {
                                        PlatformData.platform_id = "0000" + userIdx;
                                    }
                                    else {
                                        PlatformData.platform_id = newData.platformID;
                                    }
                                    var sql = "INSERT INTO DB_USER.TB_USER_PLATFORM SET ?";
                                    var query = connection.query(sql, PlatformData, function (err) {
                                        logger.debug(id, __filename, func, query.sql);
                                        if (err) {
                                            logger.error(id, __filename, func, err);
                                            cb(err);
                                        }
                                        else {
                                            cb();
                                        }
                                    });
                                }
                            ],
                                function (err) {
                                    if (err) {
                                        next(err);
                                    }
                                    else {
                                        next(null, userIdx);
                                    }
                                });
                        }
                    ],
                        function (err, userIdx) {
                            if (err) {
                                connection.rollback(function () {
                                    connection.release();
                                    callback(err);
                                });
                            }
                            else {
                                connection.commit(function (err) {
                                    if (err) {
                                        connection.rollback(function () {
                                            connection.release();
                                            logger.error(id, __filename, func, err);
                                            callback(errors.ERR_DB_TRANSACTION);
                                        });
                                    }
                                    else {
                                        connection.release();
                                        callback(null, userIdx);
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
 * 계정 link = 'y' 로 변경
 * 
 * @param uidx
 * @param callback
 */
UsersDAO.DeviceConnect = function (id, uidx, platform, callback) {
    var func = "DeviceConnect";

    poolCluster.getConnection(function (err, connection) {
        if (err) {
            logger.error("user : " + uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            if (platform == "google") {
                async.waterfall([
                    function (callback) {
                        // 계정은 존재하고 기기만 변경한 것인지 확인
                        var sql = "SELECT user_idx FROM DB_USER.TB_DEVICE WHERE id=? AND platform=?";
                        var query = connection.query(sql, [id, platform], function (err, user_idx) {
                            connection.release();
                            logger.debug(uidx, __filename, func, query.sql);
                            if (err) {
                                logger.error(uidx, __filename, func, err);
                                callback(err);
                            }
                            else {
                                callback(null, user_idx[0]);
                            }
                        });
                    },
                    function (user_idx, callback) {
                        if (!user_idx) {
                            // TB_DEVICE에 등록된 계정이 없다면 새로 생성
                            var DeviceData = {
                                user_idx: uidx,
                                id: id,
                                platform: platform,
                                link: 'y'                                
                            };
                            var sql = "INSERT INTO DB_USER.TB_DEVICE SET ?";
                            var query = connection.query(sql, DeviceData, function (err) {
                                connection.release();
                                logger.debug(uidx, __filename, func, query.sql);
                                if (err) {
                                    logger.error(uidx, __filename, func, err);
                                    callback(err);
                                }
                                else {
                                    callback();
                                }
                            });
                        }
                        else {
                            // link = 'y'로 변경. 연결
                            var sql = "UPDATE DB_USER.TB_DEVICE SET link='y' WHERE user_idx=? AND id=?";
                            var query = connection.query(sql, [uidx, id], function (err) {
                                connection.release();
                                logger.debug(uidx, __filename, func, query.sql);
                                if (err) {
                                    logger.error(uidx, __filename, func, err);
                                    callback(errors.ERR_DB_QUERY);
                                }
                                else {
                                    callback();
                                }
                            });
                        }
                    }
                ],
                    function (err, result) {
                        if (err) {
                            callback(err);
                        }
                        else {
                            callback();
                        }
                    }
                );
            }
            else {
                // link = 'y'로 변경. 연결
                var sql = "UPDATE DB_USER.TB_DEVICE SET link='y' WHERE user_idx=? AND id=?";
                var query = connection.query(sql, [uidx, id], function (err) {
                    connection.release();
                    logger.debug(uidx, __filename, func, query.sql);
                    if (err) {
                        logger.error(uidx, __filename, func, err);
                        callback(errors.ERR_DB_QUERY);
                    }
                    else {
                        callback();
                    }
                });
            }
        }
    });
};

module.exports = UsersDAO;