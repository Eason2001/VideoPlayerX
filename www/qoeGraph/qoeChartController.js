var UPDATE_INTERVAL = 250;
var NUM_UPDATES_PER_SECOND = 4;
var T = 2;
var T_0 = 1;
var T_1 = 1;
var K = 1;
var T_D = 3;
var T_U = 9;
var PROXIMITY_VAL = 3;
var RECOVERY_END_DELTA = 0.25;

var qoeChartController = function() {
    // console.log("QoE Chart Initialized");
    //define meta vars
    var _this = this;
    this.processedTimesSegments = [];
    this.processedTimes = [];
    this.qsegments = [];
    this.id = parseInt(Date.now() % (parseInt(Math.random() * 1000000000))).toString(16);
    this.agent = platform.description;
    this.lineGraph = new qoeLineGraph();
    this.meter = new qoeMeterClass();
    this.currentGraph = undefined;

    //define control vars
    this.playState = false;
    this.pauseState = false;
    this.stallState = false;
    this.rewardState = false;
    this.penaltyState = false;
    this.recoveryState = false;
    this.rewardState = false;
    this.currTime = 0;
    this.stallStartQuality = 0;
    this.stallDuration = 0;
    this.currVideoTime = 0;
    this.currQuality = -1;
    this.prevQuality = -1;
    this.penaltyStartQuality = -1;
    this.penaltyStartPrevQuality = -1;
    this.rewardStartQuality = -1;
    this.rewardStartPrevQuality = -1;
    this.penaltyStartElapsedTime = -1;
    this.penaltyStartVideoTime = -1;
    this.rewardStartElapsedTime = -1;
    this.rewardStartVideoTime = -1;
    this.stallStartTime = 0;
    this.currSection = 0;

    //handle modes
    this.mode = 1; //0 = none, 1 = graph, 2 = meter
    this.currentGraph = this.lineGraph;

    //initialize graphs
    this.lineGraph.init();
    this.meter.init();

    //define graph server function
    this.putToGraphingServer = function (data, url) {
        $.ajax({
                type: "POST",
                mimeType: 'text/html',
                url: eventLoggingServer + 'qoeScores',
                ContentType: 'application/json',
                data: data
            }
        ).done(function () {
        }).fail(function (qXHR, textStatus, errorThrown) {
            console.log(errorThrown);
        });
    };

    this.addChartData = function (x, y, graph) {
        if(y <= 0){
            return;
        }
        _this.putToGraphingServer({
            id: _this.id,
            graph: graph,
            videotime: x,
            score: y,
            segment: _this.currSection
        }, "updateGraph");
        _this.currentGraph.updateGraph(graph, {
            x: x,
            y: y
        });
        _this.meter.updateGraph(graph, {
            x: x,
            y: y
        });
    };


    //initialize graph on server
    this.putToGraphingServer({
        id: _this.id,
        cmd: "INIT",
        data: _this.agent
    }, "controlGraph");

    //define functions that alter internal state that the monitor plugin calls
    this.notifySegment = function (startTime, score, duration) {
        // //console.log("Segment notified");
        // //console.log(_this.pauseState);
        // console.log(_this.pauseState);
        if (_this.pauseState === false && !(WURFL.form_factor === "Smartphone" || WURFL.form_factor === "Feature Phone" || WURFL.form_factor === "Other Mobile")) {
            // console.log("playstate being set true from notifySegment");
            _this.playState = true;
        }

        if ($.inArray(startTime, _this.processedTimesSegments) === -1) {
            _this.qsegments.push({
                startTime: startTime,
                endTime: startTime + duration,
                score: score,
                new: true
            });
            _this.processedTimesSegments.push(startTime);
        }
    };

    this.notifyStart = function () {
        // //console.log("playstate being set to true");
        // console.log("playstate being set true from notifyStart");
        _this.playState = true;
        _this.pauseState = false;
    };

    this.notifyStop = function () {
        // console.log("stop notified");
        _this.playState = false;
        _this.pauseState = true;
        // console.log(_this.pauseState);
    };

    this.notifyStallStart = function () {
        // //console.log("notify stall start at " + _this.currVideoTime);
        if (_this.currVideoTime <= RECOVERY_END_DELTA) {
            return;
        }
        _this.stallState = true;
        _this.stallStartTime = _this.currTime;
        _this.stallStartQuality = _this.currQuality;
    };

    this.notifyStallEnd = function () {
        // //console.log("notify stall end at " + _this.currVideoTime);
        if (_this.currVideoTime <= RECOVERY_END_DELTA) {
            return;
        }
        _this.stallState = false;
        _this.recoveryState = true;
        _this.recoveryQuality = _this.currQuality;
        _this.stallDuration = _this.currTime - _this.stallStartTime;
    };

    this.notifyNewSection = function(newTime){
        _this.currSection++;
        _this.playState = false;
        _this.stallState = false;
        _this.pauseState = true;
        _this.rewardState = false;
        _this.penaltyState = false;
        _this.rewardState = false;
        this.recoveryState = false;
        _this.currTime = newTime;
        _this.currVideoTime = newTime;
        this.currentGraph.notifyNewSection();
    };

    this.notifyMaxVideoTime = function (maxVideoTime) {
        _this.lineGraph.notifyMaxVideoTime(maxVideoTime);
    };

    //define functions for calculating present qoe

    this.decayCurve = function () {
        return _this.stallStartQuality * Math.pow(Math.E, -((_this.currTime - _this.stallStartTime) / T_0));
    };

    this.recoveryCurve = function () {
        toReturn = _this.recoveryQuality + (_this.stallStartQuality * Math.pow(Math.E, -(_this.stallDuration / T_0)) - _this.recoveryQuality) * Math.pow(Math.E, -(_this.currTime - _this.stallStartTime - _this.stallDuration) / T_1);
        next = _this.recoveryQuality + (_this.stallStartQuality * Math.pow(Math.E, -(_this.stallDuration / T_0)) - _this.recoveryQuality) * Math.pow(Math.E, -(_this.currTime + UPDATE_INTERVAL / 1000 - _this.stallStartTime - _this.stallDuration) / T_1);
        if (next >= _this.recoveryQuality - RECOVERY_END_DELTA || next >= _this.currQuality - RECOVERY_END_DELTA) {
            this.recoveryState = false;
            this.rewardState = false;
            this.penaltyState = false;
        }
        return toReturn;
    };

    this.updateChart = function () {

        //graph sqm scores no matter what:
        _this.addChartData(_this.currTime, _this.currQuality, 1);

        if (_this.stallState) {
            _this.addChartData(_this.currTime, _this.decayCurve(), 0);
        }

        else if (_this.recoveryState) {
            _this.addChartData(_this.currTime, _this.recoveryCurve(), 0);
        }

        else if (_this.rewardState) {
            _this.addChartData(_this.currTime, Math.min(100, _this.rewardStartQuality + K * (_this.rewardStartQuality - _this.rewardStartPrevQuality) * Math.pow(Math.E, -(_this.currTime - _this.rewardStartElapsedTime) / T_U)), 0);
        }

        else if (_this.penaltyState) {
            _this.addChartData(_this.currTime, Math.max(0,_this.penaltyStartQuality + K * (_this.penaltyStartQuality - _this.penaltyStartPrevQuality) * Math.pow(Math.E, -(_this.currTime - _this.penaltyStartElapsedTime) / T_D)), 0);
        }


        else {
            //the QoE score is equal to SQM score, graph accordingly
            _this.addChartData(_this.currTime, _this.currQuality, 0);
        }
        if (_this.stallState) {
            _this.currVideoTime = (Math.round(player.currentTime() * NUM_UPDATES_PER_SECOND) / NUM_UPDATES_PER_SECOND);
        }
        else {
            _this.currVideoTime += UPDATE_INTERVAL / 1000;
        }
        //_this.currVideoTime = player.currentTime();
        //
    };

    this.chartWriter = setInterval(function () {
        if (_this.playState && _this.qsegments.length > 0) { //only do something to the chart if the video is playing
            // // console.log("penalty state: " + _this.penaltyState);
            // // console.log("reward state: " + _this.rewardState);
            // // console.log("stall state: " + _this.stallState);
            // // console.log("recovery state: " + _this.recoveryState);
            currSegment = _this.qsegments.filter(segment => segment.startTime <= _this.currVideoTime).filter(segment => segment.endTime >= _this.currVideoTime)[0];
            //console.log("Current video time: " + _this.currVideoTime);
            // console.log("Current segment: ", currSegment);
            // console.log(_this.qsegments);
            if (currSegment) {
                _this.currQuality = currSegment.score;
            }
            _this.updateChart();
            //check if this is the last tick of the current segment
            // _this.currVideoTime += UPDATE_INTERVAL/1000;
            if (typeof currSegment !== 'undefined' && _this.currVideoTime >= currSegment.endTime) {
                //run the updater on the next segment with time = start
                currSegment = _this.qsegments.filter(segment => segment.startTime <= _this.currVideoTime).filter(segment => segment.endTime >= _this.currVideoTime)[0];
                //check for events on switching to a new segment
                if (typeof currSegment !== 'undefined') {
                    if (currSegment.new) {
                        currSegment.new = false;
                        if (_this.currVideoTime !== 0) {
                            //update previous and current qualities
                            _this.prevQuality = _this.currQuality;
                            _this.currQuality = currSegment.score;

                            //see if a penalty should be applied
                            //debugger;
                            // console.log("current time: " + _this.currTime);
                            // console.log("current quality: " + _this.currQuality);
                            // console.log("previous quality: " + _this.prevQuality);
                            if (_this.prevQuality - _this.currQuality > T) {
                                _this.penaltyState = true;
                                _this.rewardState = false;
                                _this.penaltyStartQuality = _this.currQuality;
                                _this.penaltyStartPrevQuality = _this.prevQuality;
                                _this.penaltyStartElapsedTime = _this.currTime;
                                _this.penaltyStartVideoTime = _this.currVideoTime;
                            }
                            //see if a reward should be applied
                            else if (_this.currQuality - _this.prevQuality > T) {
                                //_this.rewardState = true;
                                _this.penaltyState = false;
                                _this.rewardStartQuality = _this.currQuality;
                                _this.rewardStartPrevQuality = _this.prevQuality;
                                _this.rewardStartElapsedTime = _this.currTime;
                                _this.rewardStartVideoTime = _this.currVideoTime;
                            }
                            //see if a penalty state should continue
                            else if (_this.penaltyState && (Math.abs(_this.currQuality - _this.penaltyStartQuality) <= PROXIMITY_VAL)) {
                                //do nothing
                            }
                            //see if a reward state should continue
                            else if (_this.rewardState && (Math.abs(_this.currQuality - _this.rewardStartQuality) <= PROXIMITY_VAL)) {
                                //do nothing
                            }
                            //the difference between segment qualities is less than T
                            else {
                                _this.rewardState = false;
                                _this.penaltyState = false;
                            }
                        }
                        else {
                            _this.currQuality = currSegment.score;
                        }
                    }
                    _this.currQuality = currSegment.score;
                    _this.currTime += 0.00000001; //to make sure everything on graph is in the right order; avoid ambiguous x values
                }
                _this.updateChart();
                _this.currVideoTime -= UPDATE_INTERVAL / 1000;
            }
            // _this.currVideoTime -= UPDATE_INTERVAL / 1000;
            _this.currTime += UPDATE_INTERVAL / 1000;
        }
    }, UPDATE_INTERVAL);

    this.resetChart = function () {
        _this.qsegments = [];
        _this.processedTimes = [];
        _this.processedTimesSegments = [];
        _this.playState = false;
        _this.stallState = false;
        _this.pauseState = true;
        _this.rewardState = false;
        _this.penaltyState = false;
        _this.rewardState = false;
        this.recoveryState = false;
        _this.currTime = 0;
        _this.currVideoTime = 0;
        _this.prevQuality = -1;
        _this.currQuality = -1;
        this.currSection = 0;
        _this.lineGraph.reset();
    };
};