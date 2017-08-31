var async = require('async');

var poolCluster = require('../lib/MySQLPoolCluster').PoolCluster;

var errors = require('../message/errors');


global.serverEnv = {};
global.commonEnv = {};
global.gameLevel = {};
global.vipLevel = {};
global.configGame = require('./ConfigGame');

function GlobalVariable() {}

GlobalVariable.allSet = function(){
    var func = "allSet";

    poolCluster.getConnection(function(err, connection){
        if(err){
            logger.error(null, "global.js", "Set Game Environment", err);
        }
        else {
            async.parallel([
                // 서버 환경 글로벌 변수 설정
                function(next){
                    var sql = "SELECT code, value FROM DB_GAME_DATA.TB_SERVER_ENV";
                    connection.query(sql, function(err, tableEnv){
                        if(err){
                            logger.error("system", __filename, func, err);
                            next(err);
                        }
                        else{
                            for(var i in tableEnv){
                                if(isNaN(tableEnv[i].value)){
                                    serverEnv[tableEnv[i].code] = tableEnv[i].value;
                                }
                                else{
                                    serverEnv[tableEnv[i].code] = parseInt(tableEnv[i].value);
                                }
                            }
                            next();
                        }
                    });
                },
                // 공통 환경 글로벌 변수 설정
                function(next){
                    var sql = "SELECT code, value FROM DB_GAME_DATA.TB_COMMON_ENV";
                    connection.query(sql, function(err, tableEnv){
                        if(err){
                            logger.error("system", __filename, func, err);
                            next(err);
                        }
                        else {
                            for(var i in tableEnv) {
                                if(isNaN(tableEnv[i].value)){
                                    commonEnv[tableEnv[i].code] = tableEnv[i].value;
                                }
                                else {
                                    commonEnv[tableEnv[i].code] = parseInt(tableEnv[i].value);
                                }
                            }
                            next();
                        }
                    });
                },
                // 게임 레벨 글로벌 설정
                function(next){
                    var sql = "SELECT lv, need_exp, hook FROM DB_GAME_DATA.TB_GAME_LEVEL";
                    connection.query(sql, function(err, tableLevel){
                        if(err){
                            logger("system", __filename, func, err);
                            next();
                        }
                        else {
                            for(var i in tableLevel){
                                gameLevel[tableLevel[i].lv] = {};
                                gameLevel[tableLevel[i].lv].need_exp = tableLevel[i].need_exp;
                                gameLevel[tableLevel[i].lv].hook = tableLevel[i].hook;
                            }
                            next();
                        }
                    });
                }
            ],
        function(err){
            connection.release();

            if(err){
                logger.error(null, "GlobalVariables.js", "Error Set Game Global Variable");
            }
            else{
                logger.debug(null, "GlobalVariables.js", "Finished Set Game Global Variable");
            }
        });
        }
    });
};

module.exports = GlobalVariable;