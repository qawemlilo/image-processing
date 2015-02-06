var express = require('express');
var router = express.Router();
var path = require('path');

// get the absolute path of the image editing file
var editor = path.resolve(__dirname, '../editor.js');


function compressAndResize (imageUrl) {

  // We need to spawn a child process so that we do not block
  // the EventLoop with cpu intensive image manipulation 
  var childProcess = require('child_process').fork(editor);

  childProcess.on('message', function(message) {
    console.log(message);
  });

  childProcess.on('error', function(error) {
    console.error(error.stack)
  });

  childProcess.on('exit', function() {
    console.log('process exited');
  });

  childProcess.send(imageUrl);
}


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.post('/upload', function(req, res, next) {
  if (req.files.image_url) {
    compressAndResize('public/images/uploads/' + req.files.image_url.name);
  }
  
  res.end('Image upload complete');
});

module.exports = router;
