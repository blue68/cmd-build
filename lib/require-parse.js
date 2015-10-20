var fs = require("fs");
var path = require("path");
var us = require("underscore");
var UglifyJS = require('uglify-js');

var parse = function(code, file, base) {
  var dir, mods, topLevel, walker;
  mods = [], depObj = {};
  dir = path.dirname(file);
  topLevel = UglifyJS.parse(code);
  walker = new UglifyJS.TreeWalker(function(node) {
    var e, sub;
    if (!(node instanceof UglifyJS.AST_Call)) {
      return;
    }
    if (node.start.value !== 'require' || node.start.type !== 'name') {
      return;
    }
    if (node.end.value !== ')' || node.end.type !== 'punc') {
      return;
    }
    e = node.expression;
    if (e == null) {
      return;
    }
    if (e.start.value !== e.end.value) {
      return;
    }
    if (e.start.type !== e.end.type) {
      return;
    }
    if (e.start.value !== 'require' || e.start.type !== 'name') {
      return;
    }
    sub = node.print_to_string().replace(/^require/, 'return');
    return mods.push(new Function('__filename', '__dirname', sub)(file, dir));
  });
  topLevel.walk(walker);
  depObj.old = mods;
  depObj.news = us.unique(mods.map(function(mod) {
    var ext;
    ext = path.extname(mod).toLowerCase();
    if (mod[0] === '.' || mod[0] === '/') {
      mod = '/' + path.relative(base, path.normalize(path.join(dir, mod)));
      if (ext !== '.js') {
        mod += '.js';
      }
    }
    return mod;
  })).sort();

  return depObj;
};

module.exports = parse;