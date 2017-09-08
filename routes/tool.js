var async = require('async');

var crypt = require('../lib/Crypt');

var errors = require('../message/errors');

var usersDAO = require('../DAO/usersDAO');
var userGamesDAO = require('../DAO/userGamesDAO');
var userToolInventoriesDAO = require('../DAO/userToolInventoriesDAO');

function Tool() {}

/**
 * 낚시 도구 강화
 * 
 * @param req
 * @param res
 */
Tool.reinforce = function(req, res){
    var func = "reinforce";

    var uidx
    var toolIdx
    var price_coin
    var price_pearl

    async.waterfall([
        // 파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;
            toolIdx = req.body.data.toolIdx;
            price_coin = req.body.data.price_coin;
            price_pearl = req.body.data.price_pearl;

            if(uidx && toolIdx && price_coin && price_pearl){
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // Tool 강화
        function(callback){
            var userItem = {
                idx: toolIdx,
                coin: price_coin,
                pearl: price_pearl
            };
            userToolInventoriesDAO.reinforceTool(uidx, userItem, function(err){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    var resultObject = {
                        code: errors.ERR_NONE.code
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
            res,status(200).send(crypt.encode(result));
        }
    });
};

/** 
 * 아이템 수리
 * 
 * @param req
 * @param res
 */
Tool.repair = function(req, res){
    var func ="repair";

    var uidx;
    var toolIdx;
    var price;

    async.waterfall([
        // 파라메터 체크
        function(callback){
            uidx = req.body.data.uidx;
            toolIdx = req.body.data.toolIdx;
            price = req.body.data.price;

            if(uidx && toolIdx && price){
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 내구도 수리
        function(callback){
            userToolInventoriesDAO.repairUserTool(uidx, toolIdx, price, function(err){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else {
                    var resultObject = {
                        code: errors.ERR_NONE.code
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
            res.status(200).sned(crypt.encode(result));
        }
    });
};


module.exports = Tool;