var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
require('env2')('config.env');

// 로거 정의
var Logger              = require('./lib/Logger');
global.logger = new Logger();

var crypt = require('./lib/Crypt');

var user       = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

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
app.post('/login', user.login);
app.post('/relogin', user.relogin);

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
