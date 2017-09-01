module.exports = {
    ERR_NONE: {
        code: 1000,
        message: "정상"
    },

    ERR_EMPTY_PARAMS: {
        code: 1001,
        message: "파라메터가 존재하지 않습니다"
    },

    ERR_INVALID_PARAMS: {
        code: 1002,
        message: "정상적인 파라메터 값이 아닙니다"
    },    

    ERR_DB_CONNECTION: {
        code: 1003,
        message: "DB 연결 실패"
    },

    ERR_DB_QUERY: {
        code: 1004,
        message: "잘못된 QUERY 입니다"
    },

    ERR_DB_TRANSACTION: {
        code: 1005,
        message: "트랜잭션 에러"
    },

    ERR_NOT_LOGIN: {
        code: 1006,
        message: "로그인된 계정이 없음"
    },

    ERR_ACCOUNT_PAUSE: {
        code: 1007,
        message: "정지된 계정"
    },

    ERR_ACCOUNT_BLOCK: {
        code: 1008,
        message: "영구정지된 계정"
    },

    ERR_NO_NICKNAME: {
        code: 1009,
        message: "닉네임이 설정되지 않음"
    },

    ERR_USER_NO_EXIST: {
        code: 1010,
        message: "유저 정보가 없음"
    },

    ERROR_MAINTENANCE: {
        code: 1998,
        message: "현재 유지 보수 중입니다"
    },
    
    ERR_USER_FISH_NOT_EXIST: {
        code: 2008,
        message: "해당 물고기를 보유하고 있지 않습니다"
    },

    ERR_CAN_NOT_EQUIP_ITEM: {
        code: 2009,
        message: "해당 아이템은 장착 변경이 불가능 합니다."
    },

    ERR_USER_NOT_EXIST:
    {
        code: 2010,
        message: "유저가 존재하지 않습니다"
    },

    ERR_USER_AQUARIUM_NOT_EXIST:
    {
        code: 2011,
        message: "보유하지 않은 수조입니다"
    }
};