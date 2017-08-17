'use strict';

module.exports = {
    mysql: {
        master: {
            connectionLimit: 100,
            host: "13.124.158.58",
            user: "root",
            password: "qwe123"
        }
    },
    log: {
        console: {
            level: "debug"
        },
        file: {
            level: "debug"
        }
    },
    // HTTP Communication Enc/Dec
    encryption: {
        state: true,
        key: "C0LTUK3mgDyjzAB09Ui8BIwTCkkR2sbJ06OnKvJq84M=",
        iv: "hJrN5XisGO652h2pFNSZ6A=="
    }
};