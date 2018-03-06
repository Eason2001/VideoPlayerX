var qoeMeterClass = function() {
    var _this = this;
    this.canvas = document.getElementById("qoeMeter");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.scale(0.9, 0.9);
    this.TO_RADIANS = Math.PI/180;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.translatex = this.canvas.width/2;
    this.translatey = this.canvas.height/2;
    this.pointerHeight = 125;
    this.pointerWidth = this.pointerHeight * 5/11;
    this.pointerOffset= this.pointerHeight * 3/11;


    this.outsideScale = new Image(); //1.4 ratio
    this.indicator = new Image(); //2.2 ratio
    this.canDraw = false;

    function setAssetReady(){
        this.ready = true;
    }

    function preloading(){
        if(_this.outsideScale.ready && _this.indicator.ready){
            _this.canDraw = true;
            drawInit();
            clearInterval(_this.preloader);
        }
    }

    function drawPointerAtAngle(angle) {
        _this.ctx.translate(_this.translatex, _this.translatey + _this.pointerOffset);
        _this.ctx.rotate(angle * _this.TO_RADIANS);
        _this.ctx.drawImage(_this.indicator, -_this.pointerWidth / 2, -_this.pointerHeight / 2 - _this.pointerOffset, _this.pointerWidth, _this.pointerHeight);
        _this.ctx.rotate(-1 * angle * _this.TO_RADIANS);
        _this.ctx.translate(-1 * _this.translatex, -1 * (_this.translatey + _this.pointerOffset));
    }

    function drawInit(){
        _this.ctx.drawImage(_this.outsideScale,0,0,_this.width,_this.height);
        drawPointerAtAngle(0);
    }
    
    this.init = function(){
        _this.outsideScale.ready = false;
        _this.outsideScale.onload = setAssetReady;
        _this.outsideScale.src = 'res/meter_A.png';
        _this.indicator.ready = false;
        _this.indicator.onload = setAssetReady;
        _this.indicator.src = 'qoeGraph/indicator.png';
        _this.preloader = setInterval(preloading, 20);
    };
    this.updateGraph = function(graph, data){
        if(graph === 0){
            _this.ctx.clearRect(0,0,_this.width,_this.height);
            _this.ctx.drawImage(_this.outsideScale,0,0,_this.width,_this.height);
            if(data.y === 100){
                data.y=105;
            }
            drawPointerAtAngle((Math.max(-50,(data.y - 10)  - 50)) * (120/50));
        }
    };

    this.reset = function(){

    }
};