var DEBUG_LEVEL = 0;
var SEEK_DELTA = 1.0;
var TIME_BETWEEN_TIME_WATCHED_UPDATES = 2.0;


var qoeChart;
var segments;
var manifest;
var player;
var infoBarController;

function setup(userID){
    segments = [];
    player = videojs($("video")[0].id);
    qoeChart = new qoeChartController();
    eventLoggingServer = eventLoggingServer + userID + "/";
    infoBarController = new infoBarControllerObject();

}

function onStallEventStart(stallStartVideoTime){
    qoeChart.notifyStallStart();
}

function onStallEventEnd(stallStartVideoTime, stallDuration, stallStartEpochTime){
    var stallEventData = {
        'videotime': stallStartVideoTime,
        'duration': stallDuration,
        'timestampstart': stallStartEpochTime,
        'timestampend': Date.now()
    };
    sendDataToEventLoggingServer(stallEventData, "stallEvents/");
    qoeChart.notifyStart();
    qoeChart.notifyStallEnd();
    if(player.currentTime() === 0){
        player.play();
    }
}

function onPlayerViewtimeProgression(totalTimeWatched){
    var watchedTimeData = {
        'timewatched': totalTimeWatched
    };
    updateDataAtEventLoggingServer(watchedTimeData, "clientEvents/TimeWatched");
}

function onPlayerTimeUpdate(currentTime){
    updateSegmentDisplay(currentTime);
}

//called when there is a new segment to be processed. Contrary to the name, this might actually be called on the same segment multiple times (sorry)
function onNewSegment(segment, quality){
    $("#SegNumber").html(segment.segmentNumber);
    $("#Quality").html(quality);
}

function onPlayerReset(){
    console.log("reset");
    clearBuffer();
    qoeChart.resetChart();
    infoBarController.reset();
    segments = [];
    qoeChart.notifyStop();
    // var stopEventData = {
    //     'timestamp': Date.now(),
    //     'videotime': previousTime
    // };
    // sendDataToEventLoggingServer(stopEventData, "userEvents/STOP");
}

function onPlayerSeek(previousTime, currentTime){
    var seekEventData = {
        'timestamp': Date.now(),
        'videotime': previousTime,
        'videotime2': currentTime
    };
    sendDataToEventLoggingServer(seekEventData, "userEvents/SEEK");
    qoeChart.notifyNewSection(currentTime);
}

function onPlayerPause(pauseTime){
    var pauseEventData = {
        'timestamp': Date.now(),
        'videotime': pauseTime
    };
    sendDataToEventLoggingServer(pauseEventData, "userEvents/PAUSE");
    qoeChart.notifyStop();
}

function onPlayerPlay(playTime){
    var playEventData = {
        'timestamp': Date.now(),
        'videotime': playTime
    };
    sendDataToEventLoggingServer(playEventData, "userEvents/PLAY");
    qoeChart.notifyStart();
}

function onPlayerLoadedMetadata(){
    qoeChart.notifyMaxVideoTime(player.duration());
    recordPlayerInformation();
    var videoLengthData = {
        'length': player.duration(),
    };
    sendDataToEventLoggingServer(videoLengthData, "playerInformation/VIDEO_LENGTH");
}

function onMPDLoad(data, isLiveData){
    sendDataToEventLoggingServer(isLiveData, "playerInformation/IS_LIVE");
    manifest = $(data)[$(data).length - 1];
    handleStreamSwitching();
}

function onNewSegmentLoad(videoSegmentData){
    // console.log(videoSegmentData);
    sendDataToEventLoggingServer(videoSegmentData, "clientEvents/videoSegments");
    qoeChart.notifySegment(parseInt(videoSegmentData.starttime), parseInt(videoSegmentData.quality), parseInt(videoSegmentData.duration));
    infoBarController.notifySegment(videoSegmentData);
}

function startQoeMonitoring(userID) {
    console.log("Plugin Started");
    setup(userID);
    console.log("Plugin Started");
    //create new viewing session - everything is done after this async call completes
    $.ajax({
            type: "POST",
            mimeType: 'text/html',
            url: eventLoggingServer,
            ContentType: 'application/json'
        }
    ).done(function (res) {
        console.log("Plugin Started");
        if (DEBUG_LEVEL >= 1) console.log("API call successful to " + eventLoggingServer);
        eventLoggingServer = (eventLoggingServer + JSON.parse(res).ViewingSessionID + "/");
        console.log(eventLoggingServer);
        var previousTime = 0;
        var currentTime = 0;
        var latestSeekEnd = 0;
        var prevTotalTimeWatched = 0;
        var totalTimeWatched = 0;
        var pauseState = true;
        player.on('timeupdate', function () {
            // console.log(currentTime);
            previousTime = currentTime;
            currentTime = player.currentTime();
            onPlayerTimeUpdate(currentTime);

            if (currentTime < 0.25) {

                if (previousTime < 0.25) { // for some reason video.js likes firing stop events multiple times after restarting video
                    return;
                }
                if (DEBUG_LEVEL >= 1) console.log("Stop event registered at " + previousTime);
                latestSeekEnd = currentTime;

                onPlayerReset();
            }
            else if (Math.abs(currentTime - previousTime) > SEEK_DELTA) {
                if (DEBUG_LEVEL >= 1) console.log("Seeking from " + previousTime + " to " + currentTime);
                latestSeekEnd = currentTime;

                onPlayerSeek(previousTime, currentTime);
            }
            else {
                totalTimeWatched += (currentTime - previousTime);
                if (totalTimeWatched > prevTotalTimeWatched + TIME_BETWEEN_TIME_WATCHED_UPDATES) {
                    if (DEBUG_LEVEL >= 1) console.log("total time watched : " + totalTimeWatched);
                    prevTotalTimeWatched = totalTimeWatched;

                    onPlayerViewtimeProgression(totalTimeWatched);
                }
            }
        });

        player.on('pause', function () {
            if (latestSeekEnd === player.currentTime() && pauseState === false) { //prevents from firing the pause event after a seek
                return;
            }
            var pauseTime = player.currentTime();
            if (DEBUG_LEVEL >= 1) console.log("Paused at " + pauseTime);
            pauseState = true;

            onPlayerPause(pauseTime);
        });

        player.on('play', function () {
            if (latestSeekEnd === player.currentTime() && pauseState === false) { //prevents from firing the play event after a seek
                return;
            }
            pauseState = false;
            var playTime = player.currentTime();
            if (DEBUG_LEVEL >= 1) console.log("Playing at " + playTime);

            onPlayerPlay(playTime);
        });

        //the following section deals with recording stalling events
        var stallStartEpochTime = Date.now();
        var stallStartVideoTime = 0;
        var inStallState = false;
        player.on('waiting', function (obj) {
            if (inStallState && player.currentTime() > 0.25) {
                return;
            }
            inStallState = true;
            stallStartVideoTime = player.currentTime();
            stallStartEpochTime = Date.now();

            if (DEBUG_LEVEL >= 1) console.log("Currently stalled due to buffer starvation at video time " + stallStartVideoTime);

            onStallEventStart(stallStartVideoTime);
        });

        player.on('playing', function () {
            if (!inStallState) {
                return;
            }
            inStallState = false;
            var stallDuration = (Date.now() - stallStartEpochTime) / 1000;
            if (DEBUG_LEVEL >= 1) console.log("Resuming playback. Total buffering time was " + stallDuration + " seconds");

            onStallEventEnd(stallStartVideoTime, stallDuration, stallStartEpochTime);
        });

        player.on('loadedmetadata', function () {
            onPlayerLoadedMetadata();

            //determine if live stream or not
            $.ajax({
                type: "GET",
                url: player.currentSrc(),
                success: function (data) {
                    var isLive;
                    var isLiveData;

                    if (typeof data.getElementsByTagName === "function") {
                        if (data.getElementsByTagName("MPD")[0].getAttribute("type") === "static") {
                            isLive = false;
                            if (DEBUG_LEVEL >= 1) console.log("Video type is static");
                        }
                        else {
                            isLive = true;
                            if (DEBUG_LEVEL >= 1) console.log("Video type is dynamic");
                        }
                        isLiveData = {
                            'isLive': isLive,
                        };
                    }

                    else {
                        /*
                            TODO: when this breaks, and it will, change the manifest so it will work with the rest of the code.
                            TODO: For some manifests, the data is returned as a parsable xml, and for others it isn't. I'm
                            TODO: not sure why it differs from source, but when it breaks this is the place to fix it
                        */
                        //data = something that wont break
                        if ($(data)[$(data).length - 1].getAttribute("type") === "static") {
                            isLive = false;
                            if (DEBUG_LEVEL >= 1) console.log("Video type is static");
                        }
                        else {
                            isLive = true;
                            if (DEBUG_LEVEL >= 1) console.log("Video type is dynamic");
                        }
                        isLiveData = {
                            'isLive': isLive,
                        };
                    }
                    onMPDLoad(data, isLiveData);
                }
            });
        });
    }).fail(function (qXHR, textStatus, errorThrown) {
        if (DEBUG_LEVEL >= 0) console.log("API call failed to " + eventLoggingServer);
        if (DEBUG_LEVEL >= 0) console.log(errorThrown);
    });
}

function updateSegmentDisplay(videoTime) {
    segments.forEach(function (segment) {
        var done = false;
        if (!done) {
            if (videoTime >= segment.startTime && videoTime <= segment.endTime) {
                var representation = manifest.getElementsByTagName("Representation");
                var quality = -1;
                [].forEach.call(representation, (function (rep) {
                    if (segment.bandwidth === parseInt(rep.attributes.bandwidth.nodeValue)) {
                        // console.log("form factor: " + WURFL.form_factor);
                        if ((WURFL.form_factor === "Smartphone" || WURFL.form_factor === "Feature Phone" || WURFL.form_factor === "Other Mobile") && rep.attributes.qualityPhone) {
                            quality = rep.attributes.qualityPhone.nodeValue.split(",")[segment.segmentNumber];
                        }
                        else if(WURFL.form_factor === "Tablet" && rep.attributes.qualityTablet){
                            quality = rep.attributes.qualityTablet.nodeValue.split(",")[segment.segmentNumber];
                        }
                        else {
                            quality = rep.attributes.qualityTV.nodeValue.split(",")[segment.segmentNumber] || -2;
                        }

                    }
                }));
                onNewSegment(segment, quality);
                done = true;
            }
        }
    });
}

function getChunkQuality(videoTime) {
    var quality = -1;
    segments.forEach(function (segment) {
        if (videoTime >= segment.startTime && videoTime <= segment.endTime) {
            var representation = manifest.getElementsByTagName("Representation");
            [].forEach.call(representation, (function (rep) {
                if (segment.bandwidth === parseInt(rep.attributes.bandwidth.nodeValue)) {
                        // console.log("form factor: " + WURFL.form_factor);
                        if ((WURFL.form_factor === "Smartphone" || WURFL.form_factor === "Feature Phone" || WURFL.form_factor === "Other Mobile") && rep.attributes.qualityPhone) {
                            quality = rep.attributes.qualityPhone.nodeValue.split(",")[segment.segmentNumber];
                        }
                        else if(WURFL.form_factor === "Tablet" && rep.attributes.qualityTablet){
                            quality = rep.attributes.qualityTablet.nodeValue.split(",")[segment.segmentNumber];
                        }
                        else {
                            quality = rep.attributes.qualityTV.nodeValue.split(",")[segment.segmentNumber] || -2;
                        }
                }
            }));
        }
    });
    return quality;
}


function sendDataToEventLoggingServer(dataToSend, apiAddress) {
    apiAddress = eventLoggingServer + apiAddress;
    $.ajax({
            type: "POST",
            mimeType: 'text/html',
            url: apiAddress,
            ContentType: 'application/json',
            data: dataToSend
        }
    ).done(function () {
        if (DEBUG_LEVEL >= 1) console.log("API call successful to " + apiAddress);
    }).fail(function (qXHR, textStatus, errorThrown) {
        if (DEBUG_LEVEL >= 0) console.log("API call failed to " + apiAddress);
        if (DEBUG_LEVEL >= 0) console.log(errorThrown);
    });
}


function updateDataAtEventLoggingServer(dataToSend, apiAddress) {
    apiAddress = eventLoggingServer + apiAddress;
    $.ajax({
            type: "PUT",
            mimeType: 'text/html',
            url: apiAddress,
            ContentType: 'application/json',
            data: dataToSend
        }
    ).done(function () {
        if (DEBUG_LEVEL >= 1) console.log("API call successful to " + apiAddress);
    }).fail(function (qXHR, textStatus, errorThrown) {
        if (DEBUG_LEVEL >= 0) console.log("API call failed to " + apiAddress);
        if (DEBUG_LEVEL >= 0) console.log(errorThrown);
    });
}

//the following section deals with recording player information
function recordPlayerInformation() {
    //send screen resolution
    var resolutionData = {
        'width': screen.width,
        'height': screen.height
    };
    sendDataToEventLoggingServer(resolutionData, "playerInformation/RESOLUTION");

    //send video player size
    var playerData = {
        'width': player.width(),
        'height': player.height()
    };
    sendDataToEventLoggingServer(playerData, "playerInformation/PLAYER_SIZE");

    //send Browser version
    var browserVersionData = {
        'platform': platform.name + ";" + platform.version + ";" + platform.description
    };
    sendDataToEventLoggingServer(browserVersionData, "playerInformation/BROWSER_VERSION");

    //send viewport visibility status
    var viewportVisbilityData = {
        'isVisible': $('#example-video').visible(),
    };
    sendDataToEventLoggingServer(viewportVisbilityData, "playerInformation/VIEWPORT_VISIBILITY");
}


//the code below sets up the required dash.js environment to access its API
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {'default': obj};
}

function handleStreamSwitching() {
    var mediaPlayer = player.dash.mediaPlayer;
    var _dashjs = (typeof window !== "undefined" ? window['dashjs'] : typeof global !== "undefined" ? global['dashjs'] : null);
    var _dashjs2 = _interopRequireDefault(_dashjs);
    mediaPlayer.on(_dashjs2['default'].MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, function (event) {
        var requestObject = event.request;
        // console.log(requestObject);
        if (requestObject.mediaInfo.bitrateList[requestObject.quality].height !== 0) {//not audio
            segments.push({
                startTime: requestObject.startTime,
                endTime: requestObject.startTime + requestObject.duration,
                bandwidth: requestObject.mediaInfo.bitrateList[requestObject.quality].bandwidth,
                segmentNumber: requestObject.startTime / requestObject.duration
            });
        }
        //console.log(requestObject);
        if (requestObject.duration) {
            if (DEBUG_LEVEL >= 2) console.log("New fragment loaded:");
            if (DEBUG_LEVEL >= 2) console.log("Chunk Start Time: " + requestObject.startTime);
            if (DEBUG_LEVEL >= 2) console.log("Chunk Duration: " + requestObject.duration);
            if (DEBUG_LEVEL >= 2) console.log("Chunk Size: " + requestObject.bytesTotal + " bytes");
            if (DEBUG_LEVEL >= 2) console.log("Chunk quality: " + requestObject.quality);
            if (DEBUG_LEVEL >= 2) console.log("Chunk type: " + requestObject.mediaInfo.mimeType);
            if (DEBUG_LEVEL >= 2) console.log("Chunk codec: " + requestObject.mediaInfo.codec);
            if (DEBUG_LEVEL >= 2) console.log("Chunk height: " + requestObject.mediaInfo.bitrateList[requestObject.quality].height);
            if (DEBUG_LEVEL >= 2) console.log("Chunk width: " + requestObject.mediaInfo.bitrateList[requestObject.quality].width);
            if (DEBUG_LEVEL >= 2) console.log("Chunk bandwidth: " + requestObject.mediaInfo.bitrateList[requestObject.quality].bandwidth);
            if (DEBUG_LEVEL >= 2) console.log("------------------------------");

            var videoSegmentData = {
                "starttime": requestObject.startTime,
                "duration": requestObject.duration,
                "size": requestObject.bytesTotal + " bytes",
                "quality": getChunkQuality(requestObject.startTime) || -3,
                "type": requestObject.mediaInfo.mimeType,
                "codec": requestObject.mediaInfo.codec,
                "height": requestObject.mediaInfo.bitrateList[requestObject.quality].height,
                "width": requestObject.mediaInfo.bitrateList[requestObject.quality].width,
                "bandwidth": requestObject.mediaInfo.bitrateList[requestObject.quality].bandwidth,
                "bitrate": (requestObject.bytesTotal * 8) / requestObject.duration,
                "timestamp": Date.now()
            };
            displaySegmentDownloadSpeed(requestObject);
            onNewSegmentLoad(videoSegmentData);
        }
    });
}

function clearBuffer() {
    var currSrc = player.src();
    player.src({
        src: 'http://dash.edgesuite.net/akamai/bbb_30fps/bbb_30fps.mpd',
        type: 'application/dash+xml'
    });
    player.src({
        src: currSrc,
        type: 'application/dash+xml'
    });
}

function displaySegmentDownloadSpeed(segment){
    var speedDisplay = document.getElementById('bandwidthDisplay');
    speedDisplay.innerHTML = (((segment.bytesLoaded * 8) / (segment.requestEndDate - segment.requestStartDate) * 1000 ) / 1000000).toFixed(2) + " Mb/s"
}