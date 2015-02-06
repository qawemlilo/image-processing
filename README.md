
For the past few months I have been involved, on and off, in building [NodeZA](https://github.com/nodeza/nodeza) - a Node.js information portal and social platform for developers in South Africa. The [NodeZA](https://github.com/nodeza/nodeza) platform is a Node.js application built from the ground up and has CMS capabilities.

Processing images uploaded from user-generated content was a problem I encountered while building [NodeZA](https://github.com/nodeza/nodeza).

This is how I wanted to handle image uploads:

  1. Save the original file
  2. Compress the original file and save the compressed version
  3. Resize the compressed version for different layouts 


This turned out to be more challenging than I had imagined. Image processing is a CPU intensive operation that can block the EventLoop if not handled correctly.

I searched the internet for days but could not find a solution that I was happy with. I have been using `Gulp` to automate image minification and resizing on my local machine with great success. However, `Gulp` is a command-line build tool, what I wanted was to process images as they were uploaded.

The good news is that `Gulp` streams all things, a `Gulp` plugin can be used in any Node.js program without modification.


### The Code

[NodeZA](https://github.com/nodeza/nodeza) uses a module called `multer` for handling image uploads, for the purposes of this tutorial I will create a very simple `express` application to demonstrate my use case.

We are going to use 2 `Gulp` plugins for images processing, `gulp-image-resize` and `gulp-imagemin`. 

Let's create our express app
(this requires express to be installed globally `npm i expresss -g`)

    express image-processing
    
    # install express dependencies
    cd image-processing && npm install
    
    # install our dependencies
    npm install gulp gulp-image-resize gulp-imagemin multer --save



Open app.js in your favourite text editor, remove all the code that we do not need, and included the multer middleware.

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


Up next, open up the routes directory and edit the index.js file.

    var express = require('express');
    var router = express.Router();
    var path = require('path');
    
    // require the image editing file
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



### Image processing

Once the form has been submitted and the image uploaded, we need to spawn a child process to handle CPU intensive image manipulation, this prevents us from blocking our precious EventLoop. Create editor.js in the root directory.

    var gulp = require('gulp');
    var imagemin = require('gulp-imagemin');
    var imageResize = require('gulp-image-resize');
    
    
    function processImg (filesrc) {
     return gulp.src(filesrc)
    
      // compress and save
      .pipe(imagemin({optimizationLevel: 5}))
      .pipe(gulp.dest('public/images/og'))
    
      // save 300 x 200
      .pipe(imageResize({
        width: 300,
        height: 200,
        crop: true
      }))
      .pipe(gulp.dest('public/images/320'))
    
      // save 120 x 120
      .pipe(imageResize({
        width: 120,
        height: 120,
        crop: true
      }))
      .pipe(gulp.dest('public/images/120'))
      
      // save 48 x 48
      .pipe(imageResize({
        width: 48,
        height: 48,
        crop: true
      }))
      .pipe(gulp.dest('public/images/48'));
    }
    
    
    process.on('message', function (images) {
      console.log('Image processing started...');
    
      var stream = processImg(images);
    
      stream.on('end', function () {
        process.send('Image processing complete');
        process.exit();
      });
    
      stream.on('error', function (err) {
        process.send(err);
        process.exit(1);
      });
    });
    
    module.exports = {};


Lastly, add form markup to the index.jade file in the views directory.

    extends layout
    
    block content
      div
        form(method='post', action='/upload', enctype='multipart/form-data')
          input(type='file', id='image_url', name='image_url')
          br
          input(type='submit', value='Upload image')


That's all. Please make sure you monitor the number of processes running at a time otherwise the app will keep on spawning new processes that could overwhelm your machine.

All the code used in this article can be found on Github - [Fork It](https://github.com/qawemlilo/image-processing). 

Keep hacking! 
