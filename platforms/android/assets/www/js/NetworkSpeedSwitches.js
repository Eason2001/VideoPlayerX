SERVER_URL = "http://52.170.47.66:3301";

function setServerSpeed(speed){
    $.ajax({
        type: "POST",
        url: SERVER_URL + "/setBitrate",
        data: {uploadSpeed:speed},
        ContentType: 'application/json'
    }).fail(function() {
        console.log("updating bitrate failed");
    });
}

function getServerSpeed(callback){
    $.ajax({
        type: "GET",
        url: SERVER_URL + "/getBitrate",
        ContentType: 'application/json'
    }).fail(function() {
        console.log("updating bitrate failed");
    }).done(function(data){
        callback(data.uploadSpeed);
    });
}