function Util() {}

/**
 * 배열 값들을 셔플하여 재 배열한다
 *
 * @param o
 * @returns {*}
 */
Util.shuffle = function(o) {
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

module.exports = Util;