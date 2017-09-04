var async = require('async');

var crypt = require('../lib/Crypt');

var errors = require('../message/errors');

var aquariumsDAO = require('../DAO/aquariumsDAO');
var usersDAO = require('../DAO/usersDAO');
var userAquariumsDAO = require('../DAO/userAquariumsDAO');
var userGamesDAO = require('../DAO/userGamesDAO');
var userWaterTanksDAO = require('../DAO/userWaterTanksDAO');

function Aquarium() { }

/**
 *  유저가 보유하고 있는 수로 리스트 가져오기
 * 
 * @param req
 * @param res
 */
Aquarium.getUserAquariums = function (req, res) {
    var func = "getUserAquariums";

    var uidx;

    async.waterfall([
        // 파라메터 체크
        function (callback) {
            uidx = req.body.data.uidx;

            if (uidx) {
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 보유하고 있는 모든 물고기 가져오기
        function (callback) {
            userAquariumsDAO.readUserAquariums(uidx, function (err, userAquariums) {
                if (err) {
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    callback(null, userAquariums);
                }
            });
        },
        function (userAquariums, callback) {
            userWaterTanksDAO.readMaxSizeFishCountPerAquarium(uidx, function (err, maxSizeFishes) {
                if (err) {
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    var resultObject = {
                        code: errors.ERR_NONE.code,
                        aquarium: userAquariums,
                        max_fish: maxSizeFishes
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
 * 수조 구매
 * 
 * @param req
 * @param res
 */
Aquarium.buyAquarium = function(req, res){
    var func = "buyAquarium";

    var uidx;
    var aquariumIdx;

    async.waterfall([
        // 파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;
            aquariumIdx = req.body.data.aquarium_idx;

            if(uidx && aquariumIdx){
                callback();
            }
            else{
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
                // 수조 가격 정보 가져오기
                function(next){
                    aquariumsDAO.readAquariumByIdx(uidx, aquariumIdx, function(err, aquarium){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else{
                            next(null, aquarium);
                        }
                    });
                }
            ],
        function(err, aquariumInfo){
            if(err){
                callback(err);
            }
            else {
                // 재화가 충분히 있나 체크
                if(aquariumInfo[1].price_type === configGame.CURRENCY_TYPE.COIN &&
                    aquariumInfo[0].coin >= aquariumInfo[1].buy_cost){
                    callback(null, aquariumInfo[1]);                        
                }
                else if(aquariumInfo[1].price_type === configGame.CURRENCY_TYPE.CORAL &&
                    aquariumInfo[0].coral >= aquariumInfo[1].buy_cost){
                    callback(null, aquariumInfo[1]);
                }
                else if(aquariumInfo[1].price_type === configGame.CURRENCY_TYPE.COIN){
                    callback(errors.ERR_NOT_ENOUGH_COIN);
                }
                else {
                    callback(errors.ERR_NOT_ENOUGH_CORAL);
                }
            }
        });
        },
        //수조 구입 처리
        function(aquarium, callback){
            userAquariumsDAO.buyUserAquarium(uidx, aquarium, function(err){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    callback();
                }
            });
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
                // 유저 보유 수조 정보 리스트 가져오기
                function(next){
                    userAquariumsDAO.readUserAquariums(uidx, function(err, userAquariums){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else {
                            next(null, userAquariums);
                        }
                    });
                }
            ],
            function(err, userInfo){
                if(err){
                    callback(err);
                }
                else {
                    var resultObject = {
                        code: errors.ERR_NONE.code,
                        coin: userInfo[0].coin,
                        coral: userInfo[0].coral,
                        aquarium: userInfo[1]
                    };
                    callback(null, resultObject);
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

/**
 *  수조 확장
 * 
 * @param req
 * @param res
 */
Aquarium.extendAquarium = function(req, res){
    var func = "extendAquarium";

    var uidx;
    var userAquariumIdx;

    async.waterfall([
        // 파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;
            userAquariumIdx = req.body.data.aquarium_idx;

            if(uidx && userAquariumIdx){
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 유저가 보유한 수조인지 확인
        function(callback){
            userAquariumsDAO.readUserAquariumByIdx(uidx, userAquariumIdx, function(err, userAquarium){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    if(!userAquarium){
                        logger.error(uidx, __filename, func, errors.ERR_USER_AQUARIUM_NOT_EXIST);
                        callback(errors.ERR_NOT_EXIST_AQUARIUM);
                    }
                    else{
                        callback(null, userAquarium);
                    }
                }
            });
        },
        function(userAquarium, callback){
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
                // 수조 정보 가져와서 확장 가능여부 체크
                function(next){
                    aquariumsDAO.readAquariumByIdx(uidx, userAquarium.aquarium_idx, function(err, aquarium){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else{
                            if(userAquarium.slot_count < configGame.AQUARIUM_INFO.MAX_SLOT){
                                next(null, aquarium);
                            }
                            else {
                                logger.error(uidx, __filename, func, errors.ERR_CAN_NOT_EXTEND_AQUARIUM);
                                next(errors.ERR_CAN_NOT_EXTEND_AQUARIUM);
                            }
                        }
                    });
                },
                // 강화에 필요한 금액 가져오기
                function(next){
                    aquariumsDAO.readExtendCost(uidx, userAquarium.aquarium_idx, userAquarium.extend, function(err, extend_price){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else{
                            next(null, extend_price);
                        }
                    });
                }
            ],
            function(err, aquariumInfo){
                if(err){
                    callback(err);
                }
                else{
                    // 수조 구매에 필요한 재화를 보유하고 있는지 체크
                    if(aquariumInfo[1].price_type === configGame.CURRENCY_TYPE.COIN &&
                        aquariumInfo[0].coin >= aquariumInfo[2].price){
                        callback(null, aquariumInfo[1], aquariumInfo[2].price);
                    }
                    else if(aquariumInfo[1].price_type === configGame.CURRENCY_TYPE.CORAL &&
                        aquariumInfo[0].coral >= aquariumInfo[2].price){
                        callback(null, aquariumInfo[1], aquariumInfo[2].price);
                    }
                    else if(aquariumInfo[1].price_type === configGame.CURRENCY_TYPE.COIN){
                        logger.error(uidx, __filename, func, errors.ERR_NOT_ENOUGH_COIN);
                        callback(errors.ERR_NOT_ENOUGH_COIN);
                    }
                    else{
                        logger.error(uidx, __filename, func, errors.ERR_NOT_ENOUGH_CORAL);
                        callback(errors.ERR_NOT_ENOUGH_CORAL);
                    }
                }
            });
        },
        // 수조 용량 확장 처리
        function(aquarium, extend_price, callback){
            userAquariumsDAO.extendAquariumScale(uidx, userAquariumIdx, aquarium, extend_price, function(err){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    callback();
                }
            });
        },
        function(callback){
            async.parallel([
                // 유저 정보 가져오기
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
                // 유저 보유 수조 리스트 가져오기
                function(next){
                    userAquariumsDAO.readUserAquariums(uidx, function(err, userAquariums){
                        if(err){
                            logger.error(uidx, __filename, func, err);
                            next(err);
                        }
                        else{
                            next(null, userAquariums);
                        }
                    });
                }
            ],
            function(err, userInfo){
                if(err){
                    callback(err);
                }
                else {
                    var resultObject = {
                        code: errors.ERR_NONE.code,
                        coin: userInfo[0].coin,
                        coral: userInfo[0].coral,
                        aquariums: userInfo[1]
                    };
                    callback(null, resultObject);
                }
            });
        }
    ],
    function(err, result){
        if(err){
            res.status(200).send(crypt.encode(err));
        }
        else{
            res.status(200).send(crypt.encode(result));
        }
    });
};

module.exports = Aquarium;