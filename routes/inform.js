function Inform() {}

/**
 * 약관 보여주기
 *
 * @param req
 * @param res
 */
Inform.terms = function(req, res) {
    var language = req.params.lang;
    res.render('inform_' + language, {term: true});
};

/**
 * 개인 정보 보여주기
 *
 * @param req
 * @param res
 */
Inform.privacy = function(req, res) {
    var language = req.params.lang;
    res.render('inform_' + language, {term: false});
};

module.exports = Inform;