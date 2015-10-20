var C = require('./c.js');

var c = C({name:"b"});
module.exports = {
  fnA : function(){
    console.log(c.printStr());
  }
}