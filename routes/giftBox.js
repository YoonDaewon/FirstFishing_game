var async = require('async');

var crypt = require('../lib/Crypt');

var errors = require('../message/errors');

var usersDAO = require('../DAO/usersDAO');
var userGamesDAO = require('../DAO/userGamesDAO');
var userGiftBoxesDAO = require('../DAO/userGiftBoxesDAO');
var userItemInventoriesDAO = require('../DAO/userItemInventoriesDAO');
var userToolInventoriesDAO = require('../DAO/userToolInventoriesDAO');

function GiftBox() {}

/**
 * 선물함 리스트 가져오기
 * 
 * @param req
 * @param res
 */
GiftBox.getGifts = function(req, res){
    var func = "getGifts";

    var uidx;

    async.waterfall([
        // 파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;

            if(uidx){
                callback();
            }
            else{
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 선물 리스트 로드
        function(callback){
            userGiftBoxesDAO.readUserGifts(uidx, function(err, userGifts){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    var resultObject = {
                        code: errors.ERR_NONE.code,
                        gifts: userGifts
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

/**
 * 선물 하나 받기
 * 
 * @param req
 * @param res
 */
GiftBox.receiveGift = function(req, res){
    var func = "receiveGift";

    var uidx;
    var userGift;

    async.waterfall([
        // 파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;
            userGift = req.body.data.userGift;

            if(uidx && userGift){
                callback();
            }
            else{
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 선물 받기
        function(callback){
            userGiftBoxesDAO.receiveGift(uidx, userGift, function(err){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    callback();
                }
            });
        },
        // 클라에게 전달할 변경된 정보 가져오기
        function(callback){
            userGamesDAO.readUserGameInfo(uidx, function(err, userGame){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    var resultObject = {
                        code: errors.ERR_NONE.code,
                        coin: userGame.coin,
                        pearl: userGame.pearl,
                        coral: userGame.cora,
                        hook: userGame.hook
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

/**
 * 선물 모두 받기
 * 
 * @param req
 * @param res
 */
GiftBox.receiveAllGift = function(req, res){
    var func = "receiveAllGift";

    var uidx;
    var userGifts;

    async.waterfall([
        //파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;
            userGifts = req.body.data.userGifts;

            if(uidx && userGifts){
                callback();
            }
            else{
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 클라로부터 전달받은 선물 리스트를 모두 수령
        function(callback){
            userGiftBoxesDAO.receiveAllGift(uidx, userGifts, function(err){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    callback();
                }
            });        
        },
        // 클라에게 전송할 변경된 재화 정보 제작
        function(callback){
            userGamesDAO.readUserGameInfo(uidx, function(err, userGame){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    var resultObject = {
                        code: errors.ERR_NONE.code,
                        coin: userGame.coin,
                        pearl: userGame.pearl,
                        coral: userGame.coral
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

/**
 * 상자 선물 받기
 * 
 * @param req
 * @param res
 */
GiftBox.receiveChest = function(req, res){
    var func = "receiveChest";

    var uidx;
    var userGift;

    async.waterfall([
        // 파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;
            userGift = req.body.data.userGift;

            if(uidx && userGift){
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 상자 열어서 수령 후, 바뀐 정보 받기
        function(callback){
            userGiftBoxesDAO.receiveChest(uidx, userGift, function(err, userGame){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                   var resultObject = {
                       code: errors.ERR_NONE.code,
                       coin: userGame.coin,
                       pearl: userGame.pearl,
                       coral: userGame.cora,
                       hook: userGame.hook
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

/**
 * HOOK 모두 받기
 * 
 * @param req
 * @param res
 */
GiftBox.receiveAllHools = function(req, res){
    var func = "receiveAllHools";

    var uidx;
    var userGifts;

    async.waterfall([
        // 파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;
            userGifts = req.body.data.userGifts;

            if(uidx && userGifts){
                callback();
            }
            else{
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // Hook 모두 받고 받은 개수 받기
        function(callback){
            userGiftBoxesDAO.receiveAllHooks(uidx, userGifts, function(err, totalHook){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    callback(null, totalHook);
                }
            });
        },
        // 바뀐 게임 정보 가져오기
        function(totalHook, callback){
            userGamesDAO.readUserGameInfo(uidx, function(err, userGame){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    var resultObject = {
                        code: errors.ERR_NONE.code,
                        coin: userGame.coin,
                        pearl: userGame.pearl,
                        coral: userGame.coral,
                        hook: userGame.hook,
                        recv_hook: totalHook
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


module.exports = GiftBox;