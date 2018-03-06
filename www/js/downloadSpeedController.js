// var speedDisplay = document.getElementById('bandwidthDisplay');
// var numSamples = 0;
// var downloadSum = 0;
// var videoSpeedMbs = 0;
//
// function speedtest() {
//     var o = new Object();
//     o.conntype = undefined;
//     o.bufferbloat = false;
//     o.hz = 1;
//     o.apiKey = '12345678';
//
//     o.oncomplete = function(o){
//         console.log(o);
//     };
//
//     o.hz = 4;
//
//     o.apiKey = '12345678'; // Test API key
//
//     // fired continuously with basic info
//     o.onstatus = function(e) {
//         if (e.direction){
//             if(e.down !== undefined && e.down !== 0){
//                 numSamples++;
//                 downloadSum += e.down || 0;
//             }
//             if(numSamples === 10){
//                 speedDisplay.innerHTML = (downloadSum / 10 + videoSpeedMbs).toFixed(2) + ' Mb/s';
//                 dslr_speedtest({op: 'stop'});
//                 numSamples = 0;
//                 downloadSum = 0;
//             }
//         }
//     };
//
//     dslr_speedtest({
//         op: 'start',
//         params: o
//     });
// }
// speedtest();
// setInterval(speedtest, 30 * 1000);