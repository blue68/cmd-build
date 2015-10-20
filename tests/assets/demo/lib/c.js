var C = function(options){
  this.options = options || {};
};

C.prototype.printStr = function(){
  console.log(this.options.name);
};
module.exports = function(options){
  return new C(options);
}