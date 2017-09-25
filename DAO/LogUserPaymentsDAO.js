var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');

function LogUserPaymentsDAO() {}

/**
 * 동일한 영수증이 존재하는지 체크
 * 
 * @param uidx
 * @param receipt
 * @param callback
 */
LogUserPaymentsDAO.checkSameReceipt = function(uidx, receipt, callback){
    var func = "checkSameReceipt";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, errors.ERR_DB_CONNECTION);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var sql = "SELECT idx FROM DB_LOG.TB_LOG_USER_PAYMENT WHERE receipt=?";
            var query = connection.query(sql, receipt, function(err, paymentLog){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    if(paymentLog[0]){
                        logger.error(uidx, __filename, func, errors.ERR_ALREADY_EXIST_RECEIPT);
                        callback(errors.ERR_ALREADY_EXIST_RECEIPT);
                    }
                    else{
                        callback();
                    }
                }
            });
        }
    });
};
 
module.exports = LogUserPaymentsDAO;