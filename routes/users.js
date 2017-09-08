var async = require('async');
var moment = require('moment');

var crypt = require('../lib/Crypt');

var errors = require('../message/errors');
var configGame = require('../config/ConfigGame')

var usersDAO = require('../DAO/usersDAO');
var userPlatformsDAO = require('../DAO/userPlatformsDAO');
var userGamesDAO = require('../DAO/userGamesDAO');
var userToolInventoriesDAO = require('../DAO/userToolInventoriesDAO');
var userItemInventoriesDAO = require('../DAO/userItemInventoriesDAO');
var userPartnerDAO = require('../DAO/userPartnerDAO');
var userWaterTanksDAO = require('../DAO/userWaterTanksDAO');
var aquariumsDAO = require('../DAO/aquariumsDAO');

function User() { }

/**
 * User Login - 연동된 계정의 유무 확인
 *
 * @param req
 * @param res 
 */
User.login = function (req, res) {
    var func = "Login";

    var device;     // 접속 운영체제 ex) a:android, i:ios ,p:pc
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
        // 계정이 있으면 바로 블락 여부, 닉네임 확인. 아니라면 err_no_login 전송
        function (user, callback) {
            var resultObject = {};

            // 접속된 계정이 없다면
            if (!user) {
                resultObject.code = errors.ERR_NOT_LOGIN.code;
                callback(null, resultObject);
            }
            // 계정이 있으면 정상 정보 전송
            else {
                usersDAO.CheckAccountState(user.user_idx, function (err, userInfo) {
                    if (err) {
                        logger.error(id, __filename, func, err);
                        callback(err);
                    }
                    else {
                        if (userInfo.state == configGame.ACCOUNT_STATE.PAUSE) {
                            resultObject.code = errors.ERR_ACCOUNT_PAUSE.code;
                            resultObject.pause_time = userInfo.pause_time;
                            callback(null, resultObject);
                        }
                        else if (userInfo.state == configGame.ACCOUNT_STATE.BLOCK) {
                            resultObject.code = errors.ERR_ACCOUNT_BLOCK.code;
                            callback(null, resultObject);
                        }
                        else {
                            if (userInfo.nickname == null) {
                                resultObject.code = errors.ERR_NO_NICKNAME.code;
                                callback(null, resultObject);
                            }
                            else {
                                resultObject.code = errors.ERR_NONE;
                                callback(null, resultObject);
                            }
                        }
                    }
                });                
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
 * 결과로 블락 여부를 리턴
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

    var resultObject = {
        code: errors.ERR_NONE.code
    }

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
                        callback(err);
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
                usersDAO.DeviceConnect(id, userIdx.idx, platform, function (err) {
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
            // 블락 여부, 닉네임 체크
            usersDAO.CheckAccountState(userIdx, function (err, userInfo) {
                if (err) {
                    logger.error(id, __filename, func, err);
                    callback(err);
                }
                else {
                    callback(null, userInfo);
                }
            });
        },
        function(userInfo, callback){
            if (userInfo.state == configGame.ACCOUNT_STATE.PAUSE) {
                resultObject.code = errors.ERR_ACCOUNT_PAUSE.code;
                resultObject.pause_time = userInfo.pause_time;
                callback(null, resultObject);
            }
            else if (userInfo.state == configGame.ACCOUNT_STATE.BLOCK) {
                resultObject.code = errors.ERR_ACCOUNT_BLOCK.code;
                callback(null, resultObject);
            }
            else {
                if (userInfo.nickname == null) {
                    resultObject.code = errors.ERR_NO_NICKNAME.code;
                    callback(null, resultObject);
                }
                else {
                    resultObject.code = errors.ERR_NONE;
                    callback(null, resultObject);
                }
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
 * Lobby로 입장하면서 유저 정보를 모두 받아옴
 * 
 * @param req
 * @param res
 */
User.lobby = function(req, res){
    var func = "lobby";
    
    var uidx;

    async.waterfall([
        // 파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;
            if(uidx){
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        function(callback){
            async.parallel([
                // 유저 게임 정보 가져오기
                function(next){
                    userGamesDAO.readUserGameInfo(uidx, function(err, userGame){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, userGame);
                        }
                    });
                },
                // Item 정보
                function(next){
                    userItemInventoriesDAO.readUserItems(uidx, function(err, userItems){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, userItems);
                        }
                    });
                },
                // Tool 정보
                function(next){
                    userToolInventoriesDAO.readUserTools(uidx, function(err, userTools){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, userTools);
                        }
                    });
                },
                // 수조정보
                function(next){
                    userWaterTanksDAO.readUserFishes(uidx, function(err, userFishes){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, userFishes);
                        }
                    });
                },
                // 파트너 정보
                function(next){
                    userPartnerDAO.readPartnerInfo(uidx, function(err, partnerInfo){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, partnerInfo);
                        }
                    });
                },
                // 파트너 의상 정보
                function(next){
                    userPartnerDAO.readPartnerDress(uidx, function(err, partnerDress){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, partnerDress);
                        }
                    });
                }
            ],
            function(err, userData){
                if(err){
                    callback(err);
                }
                else {
                    var bag = userData[1].concat(userData[2]);
                    var resultData = {
                        code: errors.ERR_NONE.code,
                        game: userData[0],
                        items: bag,
                        fishes: userData[3],
                        partner: userData[4],
                        dress: userData[5],
                        server_time: moment().utc().format("YYYY-MM-DD HH:mm:ss")
                    };
                    callback(null, resultData);
                }
            });
        }
    ],
    function(err, result){
        if(err){
            res.status(200).send(crypt.encode(err));
        }
        else {
            res.status(200).send(crypt.encode(result));
        }
    });
};


module.exports = User;