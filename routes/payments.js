var async = require('async');
var IAPVerifier = require('iap_verifier');
var IABVerifier = require('iab_verifier');

var config = require('../config/');

var crypt = require('../lib/Crypt');

var errors = require('../message/errors');

var usersDAO = require('../DAO/usersDAO');
var userGamesDAO = require('../DAO/userGamesDAO');
var logUserPaymentsDAO = require('../DAO/LogUserPaymentsDAO');

function Payment() {}

/**
 * 인앱 결제 처리
 * 
 * @param req
 * @param res
 */
Payment.processPayment = function(req, res){
    var func = "processPayment";

    var uidx;
    var region;
    var store;
    var storeIdx;
    var paymentId;
    var receipt;
    var signature;

    async.waterfall([
        // 파라메터 체크
        function(callback){
            try{
                console.log('data: ' + JSON.stringify(req.body.data));
                uidx = req.body.data.uidx;
                region = req.body.data.region;
                store = req.body.data.store;
                storeIdx = req.body.data.storeIdx;
                paymentId = req.body.data.paymentId;
                receipt = req.body.data.receipt;
                signature = req.body.data.signature;

                if(uidx && store && paymentId && receipt){
                    if(store === configGame.PLATFORM_PARAM.GOOGLE && !signature){
                        logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                        callback(errors.ERR_EMPTY_PARAMS);
                    }
                    else{
                        callback();
                    }
                }
                else {
                    logger.error(uidx, __filename, func, errors.ERR_EMPTY_PARAMS);
                    callback(errors.ERR_EMPTY_PARAMS);
                }
            }
            catch(e){
                logger.error(uidx, __filename, func, e);
                callback(errors.ERR_EMPTY_PARAMS);
            }
        },
        // 동일한 영수증이 이미 존재하는지 체크
        function(callback){
            if(store == configGame.PLATFORM_PARAM.FACEBOOK){
                callback();
            }
            else {
                logUserPaymentsDAO.checkSameReceipt(uidx, receipt, function(err){
                    if(err){
                        logger.error(uidx, __filename, func, err);
                        callback(err);
                    }
                    else {
                        callback();
                    }
                });
            }
        },
        // 영수증 검증
        function(callback){
            if(store === configGame.PLATFORM_PARAM.APPLE){
                console.log('config.receipr.apple: ' + JSON.stringify(config.receipt.apple));
                var client = new IAPVerifier(config.receipt.apple.password, config.receipt.apple.production, config.receipt.apple.debug);
                client.verifyReceipt(receipt, true, function(valid){
                    if(valid){
                        callback();
                    }
                    else {
                        logger.error(uidx, __filename, func, errors.ERR_INVALID_RECEIPT);
                        callback(errors.ERR_INVALID_RECEIPT);
                    }
                });
            } 
            else if(store === configGame.PLATFORM_PARAM.GOOGLE){
                var googlePlayVerifier = new IABVerifier(config.receipt.google);
                var isValid = googlePlayVerifier.verifyReceipt(receipt, signature);
                if(isValid){
                    callback();
                }
                else{
                    logger.error(uidx, __filename, func, errors.ERR_INVALID_RECEIPT);
                    callback(errors.ERR_INVALID_RECEIPT);
                }
            }
        },
        // 그외 기능
        function(callback){
            var resultObject = {
                code: errors.ERR_NONE.code
            };
            callback(null, resultObject);
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

module.exports = Payment;