var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
require('env2')('config.env');
require('./config/GlobalVariables').allSet();

// 로거 정의
var Logger              = require('./lib/Logger');
global.logger = new Logger();

var crypt = require('./lib/Crypt');

var user       = require('./routes/users');
var inform     = require('./routes/inform');
var fishTank   = require('./routes/fishTank');
var aquarium   = require('./routes/aquarium');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 전처리기
app.use(function(req,res,next){
  if(req.method.toLowerCase() == 'post'){
    if(req.body.data){
      req.body.data = crypt.decode(req.body.data);
    }
    else{
      next();
    }
    next();
  }
  else{
    next();
  }
});

app.get('/', function(req, res) {
    res.send('Server is Running..');
});

// 유저 관련 API
app.post('/login', user.login);                                           // 로그인 - 연결된 기기 있나 확인
app.post('/relogin', user.relogin);                                       // 리로그인 - 블락 여부 확인
app.post('/lobby', user.lobby);                                           // 로비로 이동하며 모든 정보 가져옴

// 수조 관련 API
app.post('/aquariums', aquarium.getUserAquariums);                        // 유저 보유 수저 리스트 가져오기
app.post('/aquarium/buy', aquarium.buyAquarium);                          // 수조 구입
app.post('/aquarium/extend', aquarium.extendAquarium);                    // 수조 확장

// 수조, 물고기 관련 API
app.post('/fishes', fishTank.getAquariumFishes);                          // 수조에 있는 물고기 정보 가져오기
app.post('/fish/sell', fishTank.sellFish);                                // 수조 물고기 팔기
app.post('/fish/sell/max', fishTank.sellAllMaxFishes);                    // 수조 안 모든 MAX 물고기 팔기

// 약관 및 개인정보 보호 관련 공지 보여주기
app.get('/terms/:lang', inform.terms);                                    // 약관 보여주기
app.get('/privacy/:lang', inform.privacy);                                // 개인정보 보호 보여주기

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
