var async = require('async');

var crypt = require('../lib/Crypt');

var errors = require('../message/errors');

var usersDAO = require('../DAO/usersDAO');
var userAquariumsDAO = require('../DAO/userAquariumsDAO');
var userGamesDAO = require('../DAO/userGamesDAO');
var userWaterTanksDAO = require('../DAO/userWaterTanksDAO');

function FishTank() { }

/**
 * 해당 수조안의 물고기 정보 모두 가져오기
 * 
 * @param req
 * @param res
 */
FishTank.getAquariumFishes = function (req, res) {
    var func = "getAquariumFishes";

    var uidx;
    var userAquariumIdx;

    async.waterfall([
        // 파라메터 체크
        function (callback) {
            uidx = req.body.data.uidx;
            userAquariumIdx = req.body.data.aquarium_idx;

            if (uidx && userAquariumIdx) {
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 해당 수조 보유하고 있는지 체크
        function (callback) {
            userAquariumsDAO.readUserAquariumByIdx(uidx, userAquariumIdx, function (err, userAquarium) {
                if (err) {
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    if (!userAquarium) {
                        logger.error(uidx, __filename, func, errors.ERR_USER_AQUARIUM_NOT_EXIST);
                        callback(errors.ERR_USER_AQUARIUM_NOT_EXIST);
                    }
                    else {
                        callback();
                    }
                }
            });
        },
        // 해당 수조 안의 물고기 가져오기
        function (callback) {
            userWaterTanksDAO.readUserFishesByUserAquarium(uidx, userAquariumIdx, function (err, userAquariumFishes) {
                if (err) {
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    var resultObject = {
                        code: errors.ERR_NONE.code,
                        fishes: userAquariumFishes
                    };
                    callback(null, resultObject);
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

/**
 *  물고기 팔기
 * 
 * @param req
 * @param res
 */
FishTank.sellFish = function (req, res) {
    var func = "sellFish";

    var uidx;
    var userFishTankIdx;

    async.waterfall([
        // 파라메터 체크
        function (callback) {
            uidx = req.body.data.uidx;
            userFishTankIdx = req.body.data.fish_idx;

            if (uidx && userFishTankIdx) {
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 해당 인덱스 물고기 정보 가쟈오기
        function (callback) {
            userWaterTanksDAO.readUserFishInfoByIdx(uidx, userFishTankIdx, function (err, userFish) {
                if (err) {
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    callback(null, userFish);
                }
            });
        },
        // 물고기 판매 후 유저 정보 변경
        function (userFish, callback) {
            userWaterTanksDAO.sellFishByUserFishIdx(uidx, userFish, function (err) {
                if (err) {
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    callback(null, userFish);
                }
            });
        },
        // 클라이언트에 전달할 값 불러옴
        function (userFish, callback) {
            async.parallel([
                function (next) {
                    userGamesDAO.readUserGameInfo(uidx, function (err, userGame) {
                        if (err) {
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, userGame);
                        }
                    });
                },
                function (next) {
                    userWaterTanksDAO.readUserFishesByUserAquarium(uidx, userFish.user_aquarium_idx, function (err, userAquariumFishes) {
                        if (err) {
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, userAquariumFishes);
                        }
                    });
                }
            ],
                function (err, userInfo) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        var resultObject = {
                            code: errors.ERR_NONE.code,
                            coin: userInfo[0].coin,
                            fishes: userInfo[1]
                        };
                        callback(null, resultObject);
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

/** 해당 수조의 모든 MAX 물고기 판매하기
 * 
 * @param req
 * @param res
 */
FishTank.sellAllMaxFishes = function (req, res) {
    var func = "sellAllMaxFishes";

    var uidx;
    var userAquariumIdx;

    async.waterfall([
        //파라메터 체크
        function (callback) {
            uidx = req.body.data.uidx;
            userAquariumIdx = req.body.data.aquarium_idx;

            if (uidx && userAquariumIdx) {
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // MAX 물고기 판매
        function (callback) {
            userWaterTanksDAO.sellMaxSizeFishes(uidx, userAquariumIdx, function (err) {
                if (err) {
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    callback();
                }
            });
        },
        function (callback) {
            async.parallel([
                // 변경된 유저 정보 가져옴
                function (next) {
                    userGamesDAO.readUserGameInfo(uidx, function (err, userGame) {
                        if (err) {
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, userGame);
                        }
                    });
                },
                // 변경된 수조정보 가져옴
                function (next) {
                    userWaterTanksDAO.readUserFishesByUserAquarium(uidx, userAquariumIdx, function (err, userAquariumFishes) {
                        if (err) {
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, userAquariumFishes);
                        }
                    });
                }
            ],
                function (err, userInfo) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        var resultObject = {
                            code: errors.ERR_NONE,
                            coin: userInfo[0].coin,
                            fishes: userInfo[1]
                        };

                        callback(null, resultObject);
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

module.exports = FishTank;