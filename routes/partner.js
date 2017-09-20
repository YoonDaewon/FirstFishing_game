var async = require('async');

var crypt = require('../lib/Crypt');

var errors = require('../message/errors');

var userPartnerDAO = require('../DAO/userPartnerDAO');
var userGamesDAO = require('../DAO/userGamesDAO');

function Partner(){}

/** 
 * 호감도 아이템 구매
 * 
 * @param uidx
 * @param partnerIdx
 * @param exp
 * @param price
 * @param callback
 */
Partner.buyExpItem = function(uidx, partnerIdx, exp, price, callback){
    var func = "buyExpItem";

    var uidx;
    var partnerIdx;
    var exp;
    var price;

    async.waterfall([
        // 파라메터 체트
        function(callback){
            uidx = req.body.data.uidx;
            partnerIdx = req.body.data.partnerIdx;
            exp = req.body.data.exp;
            price = req.body.data.price;

            if(uidx && partnerIdx && exp && price){
                callback();
            }
            else {
                logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 호감도 상승
        function(callback){
            userPartnerDAO.increaseExp(uidx, partnerIdx, exp, function(err){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
                    callback();
                }
            });
        },
        // 코인 차감
        function(callback){
            userGamesDAO.useCoin(uidx, price, function(err){
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(err);
                }
                else{
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
            res.status(200).send(crypt.encode(result));
        }
    });
};


module.exports = Partner;