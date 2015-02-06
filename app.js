var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var multer = require('multer');
var routes = require('./routes');


var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// handle image uploads
app.use(multer({
  dest: './public/images/uploads'
}));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);


app.listen(app.get('port') || 3000, app.get('ipAddress'),function() {
  console.log("✔ Express server listening on port %d in %s mode", app.get('port') || 3000, app.get('env'));
});
