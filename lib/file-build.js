var path = require('path');
var fs = require('fs');
var UglifyJS = require('uglify-js');
var os = require('options-stream');
var requireParse = require('./require-parse.js');

var FileBuild = function(options) {
  this.options = os({
    exportDir: "./build/",
    exname: ".js",
    importFile: "",
    filePrefix: "",
    combine: false,
    compress: false,
    combineFile: './build/build.js',
    combineMinFile: "./build/build-min.js"
  }, options);
}

FileBuild.prototype.inArray = function(value, array) {
  var i, len, val;
  for (i = 0, len = array.length; i < len; i++) {
    val = array[i];
    if (value === val) {
      return true;
    }
  }
  return false;
}
FileBuild.prototype.pushIf = function(value, array) {
  if (!this.inArray(value, array)) {
    return array.push(value);
  }
}

FileBuild.prototype.sortJsDepend = function(filePath, info, sortDepsList) {
  var depJs, i, len, ref;
  if (info.deps) {
    ref = info.deps;
    for (i = 0, len = ref.length; i < len; i++) {
      depJs = ref[i].news;
      if (depJs.indexOf('/') >= 0) {
        if (this.depsList[depJs]) {
          this.sortJsDepend(depJs, this.depsList[depJs], sortDepsList);
        }
      } else {
        this.pushIf(depJs);
      }
    }
  }
  return this.pushIf(filePath, sortDepsList);
}

FileBuild.prototype.loadJsDepend = function(fileList, depsList) {
  var i, jsFilePath, len, results, __jsFilePath;
  results = [];
  for (i = 0, len = fileList.length; i < len; i++) {
    jsFilePath = fileList[i];
    if (jsFilePath.indexOf('/') >= 0) {
      if (!path.isAbsolute(jsFilePath)) {
        __jsFilePath = jsFilePath;
        jsFilePath = path.join(process.cwd(), "./node_modules/", jsFilePath + ".js");
      } else if (jsFilePath.indexOf("node_modules") > -1) {
        __jsFilePath = jsFilePath.split(path.join(process.cwd(), "/node_modules"))[1];
      } else {
        __jsFilePath = jsFilePath.split(process.cwd())[1];
      }
      if (depsList[jsFilePath]) {
        results.push(depsList[jsFilePath].beDeps++);
      } else {
        depsList[jsFilePath] = {};
        depsList[jsFilePath].beDeps = 0;
        depsList[jsFilePath].definePath = __jsFilePath;

        results.push(function(_this, jsFilePath, depsList) {
          var code, deps;
          code = fs.readFileSync(jsFilePath, "utf-8");
          deps = requireParse(code, jsFilePath, '/');
          if (depsList[jsFilePath]) {
            depsList[jsFilePath].deps = deps;
          }
          return _this.loadJsDepend(deps.news, depsList);
        }(this, jsFilePath, depsList))
      }
    } else {
      results.push(this.pushIf(jsFilePath));
    }
  }
  return results;
}

FileBuild.prototype.getFileList = function(filePath, extname) {
  var files, res, _self = this;
  res = [];
  if (fs.existsSync(filePath)) {
    var __stats = fs.statSync(filePath);
    if (!__stats.isDirectory()) {
      res.push(filePath);
      return res;
    }
    files = fs.readdirSync(filePath);
    files.forEach(function(file) {
      var _extname, stats, _dir;
      _dir = path.resolve(filePath, file);
      stats = fs.statSync(_dir);
      if (stats.isDirectory()) {
        return res = res.concat(_self.getFileList(_dir, extname));
      } else {
        _extname = path.extname(_dir);
        if (_extname === extname) {
          return res.push(_dir);
        }
      }
    });
  }
  return res;
}

FileBuild.prototype.buildJs = function(cb) {
  var fileList, depsList, results, sortDepsList;
  var __extname = this.options.exname || ".js";
  filePath = this.options.importFile;
  fileList = this.getFileList(path.join(process.cwd(), filePath), __extname);
  depsList = {};
  this.depsList = depsList;
  sortDepsList = [];
  results = this.loadJsDepend(fileList, depsList);
  for (var key in depsList) {
    var info = depsList[key];
    this.sortJsDepend(key, info, sortDepsList);
  }
  var count = 0,
    len = sortDepsList.length;
  for (var i = 0; i < len; i++) {
    var file = sortDepsList[i];
    this.writeJs(file, depsList); //同步写文件
    count++;
  }
  if (count === len) {
    cb();
  }
}

FileBuild.prototype.mkdirDir = function(dirPath) {
  if (fs.existsSync(path.join(process.cwd(), dirPath))) {
    return;
  };
  var pathArr = dirPath.split(path.sep);
  pathArr = pathArr.filter(function(item) {
    return item !== "";
  });
  var __predir = process.cwd();
  for (var i = 0, len = pathArr.length; i < len; i++) {
    var _cur = pathArr[i];
    var _dir = path.join(__predir, _cur);
    __predir = _dir
    if (!fs.existsSync(_dir)) {
      fs.mkdirSync(_dir);
    }
  }
}

FileBuild.prototype.prettifyPath = function(filePath, isExname) {
  var minPath = '';
  if (filePath.indexOf('.js') > -1) {
    var ars = filePath.split('/');
    ars[ars.length - 1] = ars[ars.length - 1].replace(/.js/, '-min.js');
    minPath = ars.join('/');
  } else {
    if (isExname) {
      minPath = filePath + "-min.js";
    } else {
      minPath = filePath + "-min";
    }
  }
  return minPath;
}

FileBuild.prototype.writeJs = function(filePath, depsList) {
  var fileObj = depsList[filePath];
  var fileContent = "";
  var __dirArrs = fileObj.definePath.split(path.sep);
  __dirArrs.pop();

  var writeDir = path.join(this.options.exportDir, this.options.filePrefix, __dirArrs.join(path.sep));
  fileObj['dirPath'] = writeDir;
  this.mkdirDir(writeDir);

  if (fs.existsSync(filePath)) {
    fileContent = fs.readFileSync(filePath);
    fileObj["code"] = fileContent.toString();
  }
  var defineCode = '';
  var definPath = path.join(this.options.filePrefix, fileObj.definePath);
  var deps = fileObj.deps;
  var newDeps = [],
    minDeps = [],
    minDefinePath = '';
  var oldDeps = deps.old;
  for (var i = 0, len = oldDeps.length; i < len; i++) {
    var curPath = oldDeps[i];
    if (curPath[0] !== ".") {
      curPath = path.normalize(path.join(this.options.filePrefix, curPath));
    }
    if (this.options.compress) {
      minDeps.push(this.prettifyPath(curPath))
    }
    newDeps.push(curPath);
  };
  var depStrs = "",
    _str = "",
    newDepStrs = "";

  if (newDeps.length > 0) {
    depStrs = '["' + newDeps.join(",").replace(/\,/g, '","') + '"]';
  } else {
    depStrs = '[]';
  }

  if (minDeps.length > 0) {
    newDepStrs = '["' + minDeps.join(",").replace(/\,/g, '","') + '"]';
  } else {
    newDepStrs = '[]';
  }

  var str = 'define("' + definPath + '",' + depStrs + ', function(require, exports, module) {\n';

  if (this.options.compress) {
    minDefinePath = this.prettifyPath(definPath);
    _str = 'define("' + minDefinePath + '",' + newDepStrs + ', function(require, exports, module) {\n';
  }

  var _code = fileObj.code;

  if (_code.match(/require\(('|")([^.].*?)('|")\)/g)) {
    _code = _code.replace(/require\(('|")([^.].*?)('|")\)/g, "require('" + path.normalize(path.join(this.options.filePrefix, "$2")) + "')");
  }
  var _end = "\n});";

  var _compressCode = "";
  if (this.options.compress) {
    if (_code.match(/require\(('|")(.*?)([.js]+)('|")\)/g)) {
      _compressCode = _code.replace(/require\(('|")(.*?)([.js]+)('|")\)/g, "require('$2-min.js')");
    } else if (_code.match(/require\(('|")(.*?)([^.js])('|")\)/g)) {
      _compressCode = _code.replace(/require\(('|")(.*?)([^.js])('|")\)/g, "require('$2$3-min')");
    } else {
      _compressCode = _code;
    }
    fileObj["compresscode"] = _str + _compressCode + _end;
    var _definePath = this.prettifyPath(fileObj.definePath, true);
    fileObj["compressDefinePath"] = path.join(process.cwd(), this.options.exportDir, this.options.filePrefix, _definePath);
  }
  fileObj.code = str + _code + _end;

  if (fileObj.definePath.indexOf('.js') < 0) {
    fileObj.definePath = path.join(process.cwd(), this.options.exportDir, this.options.filePrefix, fileObj.definePath + ".js");
  } else {
    fileObj.definePath = path.join(process.cwd(), this.options.exportDir, this.options.filePrefix, fileObj.definePath);
  }

  if (this.options.combine) {
    var outPath = path.join(process.cwd(), this.options.combineFile);
    fs.appendFileSync(outPath, fileObj.code);

    if (this.options.compress) {
      var minOutPath = path.join(process.cwd(), this.options.combineMinFile);
      var result = UglifyJS.minify(fileObj.compresscode, {
        fromString: true
      });
      fs.appendFileSync(minOutPath, result.code.toString());
    }
  }
  fs.writeFileSync(fileObj.definePath, fileObj.code);

  if (this.options.compress) {
    var result = UglifyJS.minify(fileObj.compresscode, {
      fromString: true
    });
    fs.writeFileSync(fileObj.compressDefinePath, result.code.toString());
  }
}

module.exports = function(options) {
  return new FileBuild(options);
}
