var slider = document.getElementById("myRange");
var output = document.getElementById("networkSpeed");
var sliderContainer = document.getElementById("bitrateSlider");
var demoContainer = document.getElementById("demoContainer");
var meter = document.getElementById('qoeMeter');

var switches = document.getElementsByClassName('switch');
var allText = document.getElementsByClassName('controlBarText');

// window.screen.lockOrientation('landscape-primary');

//height needs to be limited to maintain the aspect ratio
if(window.innerHeight > window.innerWidth  * 0.703125){
    demoContainer.style.width = "100vw";
    demoContainer.style.height = "70.3125vw";
}
if(window.innerHeight <= demoContainer.clientWidth * 0.703125){ //width needs to be limited to maintain aspect ratio
    demoContainer.style.width = "142.2222vh";
    demoContainer.style.height = "100vh";
}

Array.prototype.forEach.call(switches, function(el) {
    el.style.transform = "scale("+ 1.1 * demoContainer.clientWidth / 1920+")";
    el.style.display = "block";
});

Array.prototype.forEach.call(allText, function(el) {
    el.style.fontSize = 160 * demoContainer.clientWidth / 1385 + "%";
    el.style.display = "inline-block";
});

sliderContainer.style.transform = "scale("+ demoContainer.clientWidth / 1385+")";

sliderContainer.style.display = "block";

meter.style.transformOrigin = "right bottom";
meter.style.transform = "scale("+  1.1 *  demoContainer.clientWidth / 1385+") ";

window.addEventListener('resize', function(){
//height needs to be limited to maintain the aspect ratio
    if(window.innerHeight > demoContainer.clientWidth * 0.703125){
        demoContainer.style.width = "100vw";
        demoContainer.style.height = "70.3125vw";
    }
    if(window.innerHeight <= demoContainer.clientWidth * 0.703125){ //width needs to be limited to maintain aspect ratio
        demoContainer.style.width = "142.2222vh";
        demoContainer.style.height = "100vh";
    }
    sliderContainer.style.transform = "scale("+ demoContainer.clientWidth / 1385+")";
    Array.prototype.forEach.call(switches, function(el) {
        el.style.transform = "scale("+ 1.1 * demoContainer.clientWidth / 1920+")";
    });
    Array.prototype.forEach.call(allText, function(el) {
        el.style.fontSize = 160 * demoContainer.clientWidth / 1385 + "%";
    });
    meter.style.transform = "scale("+  1.1 *  demoContainer.clientWidth / 1385+")";
});

function dropMenu() {
    document.getElementById("myDropdown").classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {

        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
};

function setInitialSlider(value){
    if(value === this.max || value === 0){
        output.innerHTML = "<strong>unlimited</strong>"
        slider.value = slider.max;
    }
    else if(value < 1000){
        output.innerHTML = "<strong>" + value + "</strong> KiB/s";
        slider.value = value;
    }
    else{
        output.innerHTML = "<strong>" + (value / 1000).toFixed(2) + "</strong> MiB/s";
        slider.value = value;
    }
}

getServerSpeed(function(speed){
    setInitialSlider(speed);
});

//output.innerHTML = "<strong>" + (slider.value / 1000).toFixed(2) + "</strong> MiB/s"; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
    if(this.value === this.max){
        output.innerHTML = "<strong>unlimited</strong>"
        setServerSpeed(0);
    }
    else if(this.value < 1000){
        output.innerHTML = "<strong>" + this.value + "</strong> Kb/s";
        setServerSpeed(this.value);
    }
    else{
        output.innerHTML = "<strong>" + (this.value / 1000).toFixed(2) + "</strong> Mb/s";
        setServerSpeed(this.value);
    }
};

function toggleNone() {
    var graph = document.getElementById("qoeChart");
    graph.style.display = "none";
    var meter = document.getElementById("qoeMeter");
    meter.style.display = "none";
}

function toggleLineGraph() {
    var graph = document.getElementById("qoeChart");
    graph.style.display = "block";
    var meter = document.getElementById("qoeMeter");
    meter.style.display = "none";
}

function toggleMeter(){
    var graph = document.getElementById("qoeChart");
    graph.style.display = "none";
    var meter = document.getElementById("qoeMeter");
    meter.style.display = "block";
}
var graph = document.getElementById("lineGraphContainer");
var meter = document.getElementById("qoeMeter");
var graphToggle = document.getElementById("chart-toggle");
var meterToggle = document.getElementById("meter-toggle");
var graphState = false;
var meterState = false;
var fakeClick = false;

graphToggle.addEventListener('click', function(){
    console.log("toggling chart");
    if(graph.style.display === "none"){
        graph.style.display = "block";
    }
    else{
        graph.style.display = "none";
    }
    graphState = !graphState;

    if(fakeClick){
        fakeClick = false;
    }
    else {
        if(graphState && meterState){
            fakeClick = true;
            meterToggle.click();
        }
    }
});

meterToggle.addEventListener('click', function(){
    console.log("toggling meter");
    if(meter.style.display === "none"){
        meter.style.display = "block";
    }
    else{
        meter.style.display = "none";
    }
    meterState = !meterState;

    if(fakeClick){
        fakeClick = false;
    }
    else {
        if(meterState && graphState){
            fakeClick = true;
            graphToggle.click();
        }
    }
});

function toggleFullScreen() {
    var doc = window.document;
    var docEl = doc.documentElement;

    var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        requestFullScreen.call(docEl);
    }
    else {
        cancelFullScreen.call(doc);
    }
}

// document.getElementsByTagName("BODY")[0].addEventListener('click', function(){
//     console.log("toggling full screen");
//     toggleFullScreen();
// });

