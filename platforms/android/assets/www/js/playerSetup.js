var myCustomCallback = function (player, mediaPlayer) {
    if (videojs && videojs.log) {
        mediaPlayer.getDebug().setLogToBrowserConsole(false);
    }
};
videojs.Html5DashJS.hook('beforeinitialize', myCustomCallback);
var player = videojs('example-video');

player.ready(function () {
    player.on('fullscreenchange', function(){console.log("changing to fullscreen")});

    player.src({
        src: videoServer + 'soccer/manifest.mpd',
        type: 'application/dash+xml'
    });

    player.play();
});

var videoNameDisplay = document.getElementById('videoNameDisplay');

document.getElementById('springLoad').addEventListener('click', function (event) {
    player.pause();
    player.src({
        src: videoServer + 'spring/manifest.mpd',
        type: 'application/dash+xml'

    });
    videoNameDisplay.innerHTML = "Spring";
    return false;
});

document.getElementById('soccerLoad').addEventListener('click', function (event) {
    player.pause();
    player.src({
        src: videoServer + 'soccer/manifest.mpd',
        type: 'application/dash+xml'

    });
    videoNameDisplay.innerHTML = "Soccer";
    return false;
});

document.getElementById('helicopterLoad').addEventListener('click', function (event) {
    player.pause();
    player.src({
        src: videoServer + 'helicopter/manifest.mpd',
        type: 'application/dash+xml'

    });
    videoNameDisplay.innerHTML = "Helicopter";
    return false;
});

player.on("waiting", function ()
{
    this.addClass("vjs-custom-waiting");
});
player.on("playing", function ()
{
    this.removeClass("vjs-custom-waiting");
});