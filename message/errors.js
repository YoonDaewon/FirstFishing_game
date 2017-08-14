module.exports = {
    ERR_NONE: {
        code: 1000,
        message: "정상"
    },

    ERR_EMPTY_PARAMS: {
        code: 1001,
        message: "파라메터가 존재하지 않습니다"
    },

    ERR_DB_CONNECTION: {
        code: 1002,
        message: "DB 연결 실패"
    },

    ERR_DB_QUERY: {
        code: 1003,
        message: "잘못된 QUERY 입니다"
    },

    ERR_DB_TRANSACTION: {
        code: 1004,
        message: "트랜잭션 에러"
    },
    ERR_NOT_LOGIN: {
        code: 1005,
        message: "로그인된 계정이 없음"
    }
};