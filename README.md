# cmd-build  [![Build Status](https://travis-ci.org/blue68/cmd-build.svg?branch=master)](https://travis-ci.org/blue68/cmd-build)

A string replace plugin for gulp

# Install

Install using [npm](https://npmjs.org/package/cmd-build).

```
npm install cmd-build --save-dev

```

# Usage

```js

var FileBuild  = require('cmd-build');

var fileBuidl = FileBuild({
    exportDir: "./build/",  // 输入文件目录
    exname: ".js",          // 后缀为js文件
    importFile: "",         // 输入参数：可以为js文件或者目录 
    filePrefix: "",         // define 前缀，比如说为：react, 输出为 "react/xx"
    combine: false,         // 是否合并为一个主文件，默认为false
    compress: false,        // 是否压缩，默认为false
    combineFile: './build/build.js',    // 合并后主文件名
    combineMinFile: "./build/build-min.js"  // 合并后主文件（压缩后）名
});
fileBuidl.buildJs(function(){
    // 执行成功操作 TODO
});


```
