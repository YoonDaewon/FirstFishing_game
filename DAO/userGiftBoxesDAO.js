var async = require('async');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;
var util = require('../lib/Util');

var errors = require('../message/errors');

function UserGiftBoxesDAO() {}

/**
 * 현재 받은 우편 리스트 가져오기
 * 
 * @param uidx
 * @param callback
 */
UserGiftBoxesDAO.readUserGifts = function(uidx, callback){
    var func = "readUserGifts";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
            var sql = "SELECT idx, sender_idx, IFNULL(sender_pf_name, '') AS sender_name, IFNULL(sender_pf_img, '') AS sender_img,";
            sql     += " IFNULL(LOWER(title), '') AS title, item_type, item_idx, item_count,";
            sql     += " TIMESTAMPDIFF(SECOND, NOW(), (created + INTERVAL 7 DAY)) AS diff_time";
            sql     += " FROM DB_USER.TB_USER_GIFT_BOX_" + shardTable;
            sql     += " WHERE uer_idx=? AND deleted='n' AND NOW() < (created + INTERVAL 7 DAY)";
            var query = connection.query(sql, uidx, function(err, userGifts){
                connection.release();
                logger.debug(uidx, __filename, func, query.sql);
                if(err){
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_QUERY);
                }
                else {
                    callback(null, userGifts);
                }
            });
        }
    });
};

/**
 * 친구에게 선물 보내기
 * 
 * @param userInfo
 * @param friendIdx
 * @param presentInfo
 * @param callback
 */
UserGiftBoxesDAO.sendFriendGift = function(userInfo, friendIdx, presentInfo ,callback){
    var func = "sendFriendGift";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(userInfo.idx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            connection.beginTransaction(function(err){
                if(err){
                    connection.release();
                    logger.error(userInfo.idx, __filename, func, err);
                    callback(errors.ERR_DB_TRANSACTION);
                }
                else {
                    async.parallel([
                        // 친구 선물함에 선물 넣기
                        // 기획 나오면 수정
                        function(next){
                            var giftData = {
                                user_idx: friendIdx,
                                sender_idx: userInfo.idx,
                                title: "friend_gift",
                                item_type: presentInfo.type,
                                item_idx: presentInfo.item_idx,
                                item_count: 1,
                                sender_pf_name: userInfo.pf_name,
                                sender_pf_img: userInfo.pf_img,
                                created: NOW()
                            };
                            var shardTable = friendIdx % parseInt(serverEnv.SHARD_COUNT);
                            var sql = "INSERT INTO DB_USER.TB_USER_GIFT_BOX_" + shardTable + " SET ?";
                            var query = connection.query(sql, giftData, function(err){
                                logger.debug(userInfo.idx, __filename, func, query.sql);
                                if(err){
                                    logger.error(userInfo.idx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else{
                                    next();
                                }
                            });
                        },
                        // 발신자 보유 선물 제거
                        function(next){
                            var sql = "UPDATE DB_USER.TB_USER_ITEM_INVENTORY SET deleted='y' WHERE idx=?";
                            var query = connection.query(sql, presentInfo.idx, function(err){
                                logger.debug(userInfo.idx, __filename, func, query.sql);
                                if(err){
                                    logger.error(userInfo.idx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else{
                                    next();
                                }
                            });
                        },
                        // 선물 보낸 로그 기록
                        function(next){
                            var sql = "INSERT INTO DB_LOG.TB_LOG_USER_GIFT_SENT (user_idx, friend_idx, created)";
                            sql     += " VALUES (?,?, NOW()) ON DUPLICATE KEY UPDATE cnt=cnt+1";
                            var query = connection.query(sql, [userInfo.idx, friendIdx], function(err){
                                logger.debug(userInfo.idx, __filename, func, query.sql);
                                if(err){
                                    logger.error(userInfo.idx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else {
                                    next();
                                }
                            });                            
                        },
                        // 로그 남기기
                        function(next){
                            var logData = {
                                uidx: userInfo.idx,
                                friend_idx: friendIdx,
                                type: "SEND_FRIEND_GIFT"
                            };
                            logger.info(userInfo.idx, __filename, func, logData);
                            next();
                        }
                    ],
                    function(err){
                        if(err){
                            connection.rollback(function(){
                                connection.release();
                                callback(err);
                            });
                        }
                        else{
                            connection.commit(function(err){
                                if(err){
                                    connection.rollback(function(){
                                        connection.release();
                                        logger.error(userInfo.idx, __filename, func, err);
                                        callback(errors.ERR_DB_TRANSACTION);
                                    });
                                }
                                else {
                                    connection.release();
                                    callback();
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
 * 선물 받기 처리 - Hook 포함
 * 
 * @param uidx
 * @param userGift
 * @param callback
 */
UserGiftBoxesDAO.receiveGift = function(uidx, userGift, callback){
    var func = "receiveGift";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            connection.beginTransaction(function(err){
                if(err){
                    connection.release();
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_TRANSACTION);
                }
                else {
                    async.parallel([
                        // 선물함의 선물 받기
                        function(next){
                            // 재화 선물이라면 종류별로 구분하여 처리
                            if(userGift.item_type === configGame.ITEM_TYPE.CURRENCY){
                                var logData = {
                                    user_idx: uidx,
                                    amount: userGift.item_count,
                                    title: userGift.title
                                };
                                if(userGift.item_idx === configGame.CURRENCY_IDX.COIN){
                                    logData.type = configGame.CURRENCY_TYPE.COIN;
                                    var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin+? WHERE idx=?";
                                }
                                else if(userGift.item_idx === configGame.CURRENCY_IDX.PEARL){
                                    logData.type = configGame.CURRENCY_TYPE.PEARL;
                                    var sql = "UPDATE DB_USER.TB_USER_GAME SET pearl=pearl+? WHERE idx=?";
                                }
                                else if(userGift.item_idx === configGame.CURRENCY_IDX.CORAL){
                                    logData.type = configGame.CURRENCY_TYPE.CORAL;
                                    var sql = "UPDATE DB_USER.TB_USER_GAME SET coral=coral+? WHERE idx=?";
                                }
                                else {
                                    var sql = "UPDATE DB_USER.TB_USER_GAME SET hook=hook=? WHERE idx=?";
                                }
                                var query = connection.query(sql, [userGift.item_count, uidx],function(err){
                                    logger.debug(uidx, __filename, func, query.sql);
                                    if(err){
                                        logger.error(uidx, __filename, func, err);
                                        next(errors.ERR_DB_QUERY);
                                    }
                                    else {
                                        // 재화 변경 로그 남기기
                                        if(userGift.item_idx != configGame.CURRENCY_IDX.HOOK){
                                            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                                            sql = "INSERT INTO DB_LOG.TB_LOG_USER_CURRENCY_" + shardTable;
                                            sql += " SET ?";
                                            query = connection.query(sql, logData, function(err){
                                                logger.debug(uidx, __filename, func, query.sql);
                                                if(err){
                                                    logger.error(uidx, __filename, func, err);
                                                    next(errors.ERR_DB_QUERY);
                                                }
                                                else{
                                                    next();
                                                }
                                            });
                                        }
                                        else {
                                            next();
                                        }
                                    }
                                });
                            }
                            // 우편이 낚시대 , 릴 인 경우
                            else if(userGift.item_type === configGame.ITEM_TYPE.ROD || userGift.item_type === configGame.ITEM_TYPE.REEL){
                                var sql = "SELECT wDurability FROM DB_GAME_DATA.TB_ITEM WHERE wRefID=?";
                                var query = connection.query(sql, userGift.item_idx, function(err,itemDurability){
                                    logger.debug(uidx, __filename, func, query.sql);
                                    if(err){
                                        logger.error(uidx, __filename, func, err);
                                        next(errors.ERR_DB_QUERY);
                                    }
                                    else {
                                        if(!itemDurability[0]){
                                            logger.error(uidx, __filename, func, errors.ERR_NOT_EXIST_ITEM);
                                            next(errors.ERR_NOT_EXIST_ITEM);
                                        }
                                        else{
                                            var newData ={
                                                user_idx: uidx,
                                                item_type: userGift.item_type,
                                                item_idx: userGift.item_idx,
                                                durability: itemDurability[0].wDurability                                                
                                            };
                                            sql = "INSERT INTO DB_USER.TB_USER_TOOL_INVENTORY SET ?, created=NOW()";
                                            query = connection.query(sql, newData, function(err){
                                                logger.debug(uidx, __filename, func, query.sql);
                                                if(err){
                                                    logger.error(uidx, __filename, func, err);
                                                    next(errors.ERR_DB_QUERY);
                                                }
                                                else {
                                                    next();
                                                }
                                            });
                                        }
                                    }
                                });                                
                            }
                            // 그 외 아이템이 루어, 낚싯줄, 캡슐 인 경우
                            else{
                                var sql = "SELECT wDurability FROM DB_GAME_DATA.TB_ITEM WHERE wRefID=?";
                                var query = connection.query(sql, userGift.item_idx, function(err, itemCount){
                                    logger.debug(uidx, __filename, func, query.sql);
                                    if(err){
                                        logger.error(uidx, __filename, func, err);
                                        next(errors.ERR_DB_QUERY);
                                    }
                                    else{
                                        if(!itemCount[0]){
                                            logger.error(uidx, __filename, func, errors.ERR_NOT_EXIST_ITEM);
                                            next(errors.ERR_NOT_EXIST_ITEM);
                                        }
                                        else{
                                            var newData = {
                                                user_idx: uidx,
                                                item_type: userGift.item_type,
                                                item_idx: userGift.item_idx,
                                                count: itemCount[0].wDurability
                                            };
                                            sql = "INSERT INTO DB_USER.TB_USER_ITEM_INVENTORY SET ?, created=NOW()";
                                            query = connection.query(sql, newData, function(err){
                                                logger.debug(uidx, __filename, func, query.sql);
                                                if(err){
                                                    logger.error(uidx, __filename, func, err);
                                                    next(errors.ERR_DB_QUERY);
                                                }
                                                else{
                                                    next();
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        },
                        // 선물함에서 선물 삭제
                        function(next){
                            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                            var sql = "UPDATE DB_USER.TB_USER_GIFT_BOX_" + shardTable + " SET deleted='y' WHERE idx=? AND user_idx=?";
                            var query = connection.query(sql, [userGift.idx, uidx], function(err){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else{
                                    next();
                                }
                            });
                        },
                        // 선물함에 받은 기록 남기기
                        function(next){
                            var logData = {
                                item_type: userGift.item_type,
                                item_idx: userGift.item_idx,
                                item_count: userGift.item_count,
                                type: "RECEIVE GIFT"
                            };
                            logger.info(uidx, __filename, func, logData);
                            next();
                        }
                    ],
                    function(err){
                        if(err){
                            connection.rollback(function(){
                                connection.release();
                                callback(err);
                            });
                        }
                        else {
                            connection.commit(function(err){
                                if(err){
                                    connection.rollback(function(){
                                        connection.release();
                                        logger.error(uidx, __filename, func, err);
                                        callback(errors.ERR_DB_TRANSACTION);
                                    });
                                }
                                else{
                                    connection.release();
                                    callback();
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
 * 선물 한번에 모두 받기. 단, Hook은 제외
 * 
 * @param uidx
 * @param userGifts
 * @param callback
 */
UserGiftBoxesDAO.receiveAllGift = function(uidxm, userGifts, callback){
    var func = "receiveGiftByTab";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else {
            connection.beginTransaction(function(err){
                if(err){
                    connection.release();
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_TRANSACTION);
                }
                else {
                    async.parallel([
                        // 선물함에 있는 모든 아이템을 각 인벤토리에 넣어준다
                        function(cb){
                            var i = 0;
                            async.whilst(
                                function() { return i < userGifts.length; },
                                function(next){
                                    // 재화일 경우
                                    if(userGifts[i].item_type === configGame.ITEM_TYPE.CURRENCY){
                                        var logData = {
                                            user_idx: uidx,
                                            amount: userGifts[i].item_count,
                                            title: userGifts[i].title
                                        };
                                        if(userGifts[i].item_idx === configGame.CURRENCY_IDX.COIN){
                                            logData.type = configGame.CURRENCY_TYPE.COIN;                                            
                                            var sql = "UPDATE DB_USER.TB_USER_GAME SET coin=coin+? WHERE idx=?";
                                        }
                                        else if(userGifts[i].item_idx === configGame.CURRENCY_IDX.PEARL){
                                            logData.type = configGame.CURRENCY_TYPE.PEARL;
                                            var sql = "UPDATE DB_USER.TB_USER_GAME SET pearl=pearl+? WHERE idx=?";
                                        }
                                        else if(userGifts[i].item_idx === configGame.CURRENCY_IDX.CORAL){
                                            logData.type = configGame.CURRENCY_TYPE.CORAL;
                                            var sql = "UPDATE DB_USER.TB_USER_GAME SET coral=coral+? WHERE idx=?";
                                        }
                                        else{
                                            i++;
                                            next();
                                        }

                                        var query = connection.query(sql, [userGifts[i].item_count, uidx], function(err){
                                            logger.debug(uidx, __filename, func, query.sql);
                                            if(err){
                                                logger.error(uidx, __filename, func, err);
                                                next(errors.ERR_DB_QUERY);
                                            }
                                            else{
                                                var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                                                sql = "INSERT INTO DB_LOG.TB_LOG_USER_CURRENCY_" + shardTable;
                                                sql += " SET ?, created=NOW()";
                                                query = connection.query(sql, logData, function(err){
                                                    logger.debug(uidx, __filename, func, query.sql);
                                                    if(err){
                                                        logger.error(uidx, __filename, func, err);
                                                        next(err);
                                                    }
                                                    else{
                                                        logger.info(uidx, __filename, func, logData);
                                                        i++;
                                                        next();
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    // 낚시대나 릴인 경우
                                    else if(userGifts[i].item_type === configGame.ITEM_TYPE.ROD || userGifts[i].item_type === configGame.ITEM_TYPE.RELL){
                                        var sql = "SELECT wDurability FROM DB_GAME_DATA.TB_ITEM WHERE wRefID=?";
                                        var query = connection.query(sql, userGifts[i].item_idx, function(err, itemDurability){
                                            logger.debug(uidx, __filename, func, query.sql);
                                            if(err){
                                                logger.error(uidx, __filename, func, err);
                                                next(errors.ERR_DB_QUERY);
                                            }
                                            else {
                                                if(!itemDurability[0]){
                                                    logger.error(uidx, __filename, func, errors.ERR_NOT_EXIST_ITEM);
                                                    next(errors.ERR_NOT_EXIST_ITEM);
                                                }
                                                else{
                                                    var newData ={
                                                        user_idx: uidx,
                                                        item_type: userGifts[i].item_type,
                                                        item_idx: userGifts[i].item_idx,
                                                        durability: itemDurability[0].wDurability                                                
                                                    };
                                                    sql = "INSERT INTO DB_USER.TB_USER_TOOL_INVENTORY SET ?, created=NOW()";
                                                    query = connection.query(sql, newData, function(err){
                                                        logger.debug(uidx, __filename, func, query.sql);
                                                        if(err){
                                                            logger.error(uidx, __filename, func, err);
                                                            next(errors.ERR_DB_QUERY);
                                                        }
                                                        else {
                                                            i++;
                                                            next();
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                    }
                                    // 그 외 아이템, 캡슐, 낚싯줄인 경우
                                    else{
                                        var sql = "SELECT wDurability FROM DB_GAME_DATA.TB_ITEM WHERE wRefID=?";
                                        var query = connection.query(sql, userGifts[i].item_idx, function(err, itemCount){
                                            logger.debug(uidx, __filename, func, query.sql);
                                            if(err){
                                                logger.error(uidx, __filename, func, err);
                                                next(errors.ERR_DB_QUERY);
                                            }
                                            else{
                                                if(!itemCount[0]){
                                                    logger.error(uidx, __filename, func, errors.ERR_NOT_EXIST_ITEM);
                                                    next(errors.ERR_NOT_EXIST_ITEM);
                                                }
                                                else{
                                                    var newData = {
                                                        user_idx: uidx,
                                                        item_type: userGifts[i].item_type,
                                                        item_idx: userGifts[i].item_idx,
                                                        count: itemCount[0].wDurability
                                                    };
                                                    sql = "INSERT INTO DB_USER.TB_USER_ITEM_INVENTORY SET ?, created=NOW()";
                                                    query = connection.query(sql, newData, function(err){
                                                        logger.debug(uidx, __filename, func, query.sql);
                                                        if(err){
                                                            logger.error(uidx, __filename, func, err);
                                                            next(errors.ERR_DB_QUERY);
                                                        }
                                                        else{
                                                            i++;
                                                            next();
                                                        }
                                                    });
                                                }
                                            }
                                        });                                        
                                    }
                                },
                                function(err){
                                    if(err){
                                        cb(err);
                                    }
                                    else{
                                        cb();
                                    }
                                }
                            );
                        },
                        // 유저 보유 모든 선물 삭제 처리
                        function(cb){
                            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                            var sql = "UPDATE DB_USER.TB_USER_GIFT_BOX_" + shardTable + " SET deleted='y'"; 
                            sql     += " WHERE user_idx=? AND deleted='n' AND item_type!=? AND item item_idx!=?";
                            var query = connection.query(sql, [uidx, configGame.ITEM_TYPE.CHEST, configGame.CURRENCY_IDX.HOOK], function(err){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    cb(errors.ERR_DB_QUERY);
                                }
                                else{
                                    cb();
                                }
                            });
                        },
                        // 받은 선물 로그 남기기
                        function(cb){
                            for(var i in userGifts){
                                var logData = {
                                    item_type: userGifts[i].item_type,
                                    item_idx: userGifts[i].item_idx,
                                    item_count: userGifts[i].item_count,
                                    type: "RECEIVE_GIFT"
                                };
                                logger.info(uidx, __filename, func, logData);
                            }
                            cb();
                        }
                    ],
                    function(err){
                        if(err){
                            connection.rollback(function(){
                                connection.release();
                                callback(err);
                            });
                        }
                        else{
                            connection.commit(function(err){
                                if(err){
                                    connection.beginTransaction(function(){
                                        connection.release();
                                        logger.error(uidx, __filename, func, err);
                                        callback(errors.ERR_DB_TRANSACTION);
                                    });
                                }
                                else {
                                    connection.release();
                                    callback();
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
 * 상자 선물 받기
 * 
 * @param uidx
 * @param userGift
 * @param callback
 */
UserGiftBoxesDAO.receiveChest = function(uidx, userGift, callback){
    var func = "receiveChest";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(uidx, __filename, func, err);
            callback(errors.ERR_DB_CONNECTION);
        }
        else{
            connection.beginTransaction(function(err){
                if(err){
                    connection.release();
                    logger.error(uidx, __filename, func, err);
                    callback(errors.ERR_DB_TRANSACTION);
                }
                else{
                    async.waterfall([
                        // 선물 갓챠
                        function(next){
                            var sql = "SELECT gift_idx, item_idx, item_cnt, gift_ratio";
                            sql     += " FROM DB_GAME_DATA.TB_GIFT_BOX WHERE giftbox_idx=?";
                            var query = connection.query(sql, userGift.item_idx, function(err, giftRatio){
                                logger.debug(uidx ,__filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else{
                                    if(!giftRatio){
                                        logger.error(uidx, __filename, func, errors.ERR_INVALID_DB_DATA);
                                        next(errors.ERR_INVALID_DB_DATA);
                                    }
                                    else{
                                        var boxArray = new Array;
                                        var ratio;
                                        
                                        for(var i=0 ; i < giftRatio.length ; i++){
                                            ratio = giftRatio[i]["gift_ratio"];
                                            for(var j=0 ; j < ratio ; j++){
                                                boxArray.push(giftRatio[i]["gift_idx"]);
                                            }
                                        }
                                        var shuffleArray = util.shuffle(boxArray);
                                        var randNo = Math.floor(Math.random() * shuffleArray.length);

                                        next(null, shuffleArray[randNo]);
                                    }
                                }
                            });
                        },
                        // 선택된 선물의 종류, 양 검색
                        function(gift_id, next){
                            var sql = "SELECT item_idx, item_cnt FROM DB_GAME_DATA.TB_GIFT_BOX WHERE giftbox_idx=? AND gift_idx=?";
                            var query = connection.query(sql, [userGift.item_idx, gift_id], function(err, giftReward){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else{
                                    next(null, giftReward[0]);
                                }
                            });
                        },
                        // 해당 선물 삭제
                        function(giftReward, next){
                            var shardTable = uidx % parseInt(serverEnv.SHARD_COUNT);
                            var sql = "UPDATE DB_USER.TB_USER_GIFT_BOX_" + shardTable + " SET deleted='y'";
                            sql     += " WHERE user_idx=? AND deleted='n' AND idx=?";
                            var query = connection.query(sql, [uidx, userGift.idx], function(err){
                                logger.debug(uidx, __filename, func, query.sql);
                                if(err){
                                    logger.error(uidx, __filename, func, err);
                                    next(errors.ERR_DB_QUERY);
                                }
                                else{
                                    next(null, giftReward);
                                }
                            });
                        },
                        // 선물 로그 생성
                        function(giftReward, next){
                            var logData = {
                                item_type: userGift.item_type,
                                item_idx: userGift.item_idx,
                                reward_type: giftReward.item_idx,
                                reward_count: giftReward.item_cnt,
                                type: "RECEIVE CHEST"
                            };
                            logger.info(uidx, __filename, func, logData);
                            next(null, giftReward);
                        }
                    ],
                    function(err, giftReward){
                        if(err){
                            connection.rollback(function(){
                                connection.release();
                                callback(err);
                            });
                        }
                        else{
                            connection.commit(function(err){
                                if(err){
                                    connection.rollback(function(){
                                        connection.release();
                                        logger.error(uidx, __filename, func, err);
                                        callback(errors.ERR_DB_TRANSACTION);
                                    });
                                }
                                else{
                                    connection.release();
                                    callback(null, giftReward);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};
 
module.exports = UserGiftBoxesDAO;