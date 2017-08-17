var async = require('async');
var moment = require('moment');

var crypt = require('../lib/Crypt');

var errors = require('../message/errors');

var usersDAO = require('../DAO/usersDAO');
var userPlatformsDAO = require('../DAO/userPlatformsDAO');
var userGamesDAO = require('../DAO/userGamesDAO');

function User() { }

/**
 * User Login - 연동된 계정의 유무 확인
 *
 * @param req
 * @param res 
 */
User.login = function (req, res) {
    var func = "Login";

    var device;     // 접속 운영체제 ex) g,i,p
    var id;         // Device ID
    var platform;   // 연결된 플랫폼
    var platformID; // 플랫폼 ID
    var language;   // 사용자 언어

    async.waterfall([
        // 파라메터 저장
        function (callback) {
            id = req.body.data.id;
            device = req.body.data.device;
            platform = req.body.data.platform;
            platformID = req.body.data.platformID;
            language = req.body.data.lang;

            logger.debug(id, __filename, func, 'login=>req.body.data: ' + JSON.stringify(req.body.data));
            if (device && id && language) {
                res.send("asaaa");
                callback();
            } else {
                logger.error(id, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // Device ID 를 이용하여 TB_DEVICE에서 현재 기계에 접속된 계정이 있나 확인
        function (callback) {
            usersDAO.readUserIdxByDeviceID(id, function (err, user) {
                if (err) {
                    logger.error(id, __filename, func, err);
                    callback(err);
                }
                else {
                    callback(null, user);
                }
            });
        },
        // 계정이 있으면 바로 로그인처리. 아니라면 err_no_login 전송
        function (user, callback) {

            var resultObject = {
                code: errors.ERR_NONE.code,
                uidx: id
            };

            // 접속된 계정이 없다면
            if (!user) {
                resultObject.code = errors.ERR_NOT_LOGIN.code;
                callback(null, resultObject);
            }
            // 계정이 있으면 로그인
            else {
                // resultObject에 데이터들을 추가하여 정상 코드와 함께 전송
                // 미구현.
                callback(null, resultObject);
            }
        }
    ],
        function (err, result) {
            if (err) {
                res.status(200).send(crypt.encode(err));
            }
            else {
                res.status(200).send(crypt.encode(result));
            }
        });
};

/**
 * 연동된 계정이 없을 경우, 클라에서 선택된 결과로 다시 로그인
 * 
 * @param req
 * @param res
 */
User.relogin = function (req, res) {
    var func = "ReLogin";

    var device;
    var id;
    var platform;
    var platformID;
    var language;

    async.waterfall([
        function (callback) {
            // 파라메터 저장
            id = req.body.data.id;
            device = req.body.data.device;
            platform = req.body.data.platform;
            platformID = req.body.data.platformID;
            language = req.body.data.lang;

            logger.debug(id, __filename, func, 'ReLogin=>req.body.data: ' + JSON.stringify(req.body.data));
            if (device && id && language) {
                callback();
            }
            else {
                logger.error(errors.ERR_EMPTY_PARAMS);
            }
        },
        function (callback) {
            if (platform == 'guest') {
                usersDAO.readUserIdxFromTB_USER(id, platform, function (err, userIdx) {
                    if (err) {
                        logger.error(id, __filename, func, err);
                        callback(er);
                    }
                    else {
                        callback(null, userIdx);
                    }
                });
            }
            else if (platform == 'google') {
                userPlatformsDAO.ReadUserIdxByPlatformID(id, platform, platformID, function (err, userIdx) {
                    if (err) {
                        logger.error(id, __filename, func, err);
                        callback(err);
                    }
                    else {
                        callback(null, userIdx);
                    }
                });
            }
        },
        function (userIdx, callback) {
            if (!userIdx) {
                // 신규가입
                var newUserData = {
                    id: id,
                    platform: platform,
                    platformID: platformID,
                    lang: language
                };
                usersDAO.createUser(newUserData, function (err, userIdx) {
                    if (err) {
                        logger.error(id, __filename, func, err);
                        callback(err);
                    }
                    else {
                        callback(null, userIdx);
                    }
                });
            }
            else {
                // 이전 사용 계정이 존재하면 연결시켜줌      
                usersDAO.DeviceConnect(id, userIdx, platform, function (err) {
                    if (err) {
                        logger.error(id, __filename, func, err);
                        callback(err);
                    }
                    else {
                        callback(null, userIdx);
                    }
                });
            }
        },
        function (userIdx, callback) {
            // 불러온 계정이 연결 됐으므로, 바로 유저 정보를 가져옴
            userGamesDAO.readUserGameInfo(userIdx, function (err, userData) {
                if (err) {
                    logger.error(id, __filename, func, err);
                    callback(err);
                }
                else {
                    callback(null, userData);
                }
            });
        }
    ],
        function (err, result) {
            if (err) {
                res.status(200).send(crypt.encode(err));
            }
            else {
                res.status(200).send(crypt.encode(result));
            }
        });
};

module.exports = User;