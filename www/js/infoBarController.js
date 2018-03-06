var bufferTimeDisplay = document.getElementById("bufferTimeDisplay");
var downloadSpeedDisplay = document.getElementById("downloadSpeedDisplay");
var videoBitrateDisplay = document.getElementById("videoBitrateDisplay");
var videoBandwidthDisplay = document.getElementById("videoBandwidthDisplay");
var BAR_UPDATE_INTERVAL = 100;

var infoBarControllerObject = function(){
    var _this = this;
    this.qsegments = [];
    this.getCurrentSegment = function(){
        this.currVideoTime = player.currentTime();
        return this.qsegments.filter(segment => segment.starttime <= this.currVideoTime).filter(segment => segment.starttime + segment.duration >= this.currVideoTime)[0];
    };
    this.notifySegment = function(segment){
        // console.log("receiving segment");
        // console.log(segment);
        this.qsegments.push(segment);
    };
    this.infoBarWriter = setInterval(function(){
        if(player.readyState()){
            //display how much buffer remains
            var bufferedTime = 0;
            for(var bufferIndex = 0; bufferIndex < player.buffered().length; bufferIndex++){
                if(player.currentTime() >= player.buffered().start(bufferIndex) && player.currentTime() <= player.buffered().end(bufferIndex)){
                    bufferedTime = player.buffered().end(bufferIndex) - player.currentTime();
                }
            }
            if(bufferedTime < 60){
                bufferTimeDisplay.innerHTML = (new Date(bufferedTime * 1000).toISOString().substr(14, 5)) + " sec";
            } else{
                bufferTimeDisplay.innerHTML = (new Date(bufferedTime * 1000).toISOString().substr(14, 5)) + " min";
            }
            //display the bitrate of current chunk
            var currBitrate;
            if(_this.getCurrentSegment() === undefined){
                currBitrate = 0;
            }
            else{
                currBitrate = _this.getCurrentSegment().bitrate / 1000;
            }
            videoSpeedMbs = currBitrate / 1000;
            if(currBitrate > 1000){
                currBitrate /= 1000;
                videoBitrateDisplay.innerHTML = currBitrate.toFixed(2) + " Mb/s";
            }
            else{
                videoBitrateDisplay.innerHTML = currBitrate.toFixed(2) + " Kb/s";
            }
            // console.log(_this.getCurrentSegment());

            //display the bandwidth of current chunk
            // var currBandwidth = _this.getCurrentSegment().bandwidth / 1000;
            // if(currBandwidth > 1000){
            //     currBandwidth /= 1000;
            //     videoBandwidthDisplay.innerHTML = currBandwidth.toFixed(2) + " Mb/s";
            // }
            // else{
            //     videoBandwidthDisplay.innerHTML = currBandwidth.toFixed(2) + " Kb/s";
            // }

        }
    }, BAR_UPDATE_INTERVAL)

    this.reset = function(){
        console.log("resetting segments in info bar controller");
        this.qsegments = [];
    }
};