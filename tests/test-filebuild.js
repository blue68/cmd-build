var path        = require("path");
var fs          = require('fs');
var fsexa       = require('fs-extra')
var expect      = require('expect.js');
var FileBuild   = require('../lib/file-build.js');
var requireParse = require('../lib/require-parse.js');

describe('file-build', function(){

  var clearTestDir = function(filePath, done){
    var textFilePath = path.join(process.cwd(), filePath);
    if(fs.existsSync(textFilePath)){
      fsexa.remove(textFilePath, function(){
        done();
      });
    }else{
      done();
    }
  };

  before(function(done){
    clearTestDir("./tests/build/", done);
  });

  after(function(done){
    clearTestDir("./tests/build/", done);
  });

  it("Input parameters for the file", function(done){
    var fileBuild = FileBuild({
      exportDir : "./tests/build/",
      exname : ".js",
      importFile : "./tests/assets/demo/main.js",
      filePrefix : "demo"
    });

    fileBuild.buildJs(function(){
      var filePath = path.join(process.cwd(), "./tests/build/demo/tests/assets/demo/main.js");
      fs.readFile(filePath, function(err, data){
        expect('define("demo/tests/assets/demo/main.js",["./lib/a.js"], function(require, exports, module) {\nvar a = require(\'./lib/a.js\');\n});').to.be(data.toString());
        done();
      })
    });
  });

  it("Input parameters for the dir", function(done){
    var fileBuild = FileBuild({
      exportDir : "./tests/build/",
      exname : ".js",
      importFile : "./tests/assets/demo2/",
      filePrefix : "demo"
    });

    fileBuild.buildJs(function(){
      var filePath = path.join(process.cwd(), "./tests/build/demo/tests/assets/demo2/a.js");
      fs.readFile(filePath, function(err, data){
        expect('define("demo/tests/assets/demo2/a.js",["./b"], function(require, exports, module) {\nvar b = require(\'./b\');\n\nmodule.exports = {\n  name : "a.js"\n};\n});').to.be(data.toString());
        done();
      })
    });
  });

  it("Generated files into a new file", function(done){
    var fileBuild = FileBuild({
      exportDir : "./tests/build/",
      exname : ".js",
      importFile : "./tests/assets/demo2/",
      filePrefix : "demo",
      combine : true,
      combineFile : './tests/build/build.js'
    });

    fileBuild.buildJs(function(){
      var filePath = path.join(process.cwd(), "./tests/build/build.js");
      fs.readFile(filePath, function(err, data){
        expect(647).to.be(data.toString().length);
        expect('define("demo/tests/assets/demo2/a.js",["./b"], function(require, exports, module) {\nvar b = require(\'./b\');\n\nmodule.exports = {\n  name : "a.js"\n};\n});define("demo/tests/assets/demo2/b.js",["./c.js"], function(require, exports, module) {\nvar C = require(\'./c.js\');\n\nvar c = C({name:"b"});\nmodule.exports = {\n  fnA : function(){\n    console.log(c.printStr());\n  }\n}\n});define("demo/tests/assets/demo2/c.js",[], function(require, exports, module) {\nvar C = function(options){\n  this.options = options || {};\n};\n\nC.prototype.printStr = function(){\n  console.log(this.options.name);\n};\nmodule.exports = function(options){\n  return new C(options);\n}\n});').to.be(data.toString());
        done();
      })
    });
  });

  it("compress is true", function(done){
    var fileBuild = FileBuild({
      exportDir : "./tests/build/",
      exname : ".js",
      importFile : "./tests/assets/demo2/",
      filePrefix : "demo",
      combine : true,
      compress : true,
      combineFile : './tests/build/build.js',
      combineMinFile : './tests/build/build-min.js'
    });

    fileBuild.buildJs(function(){
      var filePath = path.join(process.cwd(), "./tests/build/build-min.js");
      fs.readFile(filePath, function(err, data){
        expect(480).to.be(data.length);
        var _file = path.join(process.cwd(), "./tests/build/demo/tests/assets/demo2/a.js");
        fs.readFile(_file, function(err, data){
          var deps = requireParse(data.toString(), _file, '/');
          expect(deps.old).to.eql([ './b' ])
          done();
        });
      });
    });
  });
});