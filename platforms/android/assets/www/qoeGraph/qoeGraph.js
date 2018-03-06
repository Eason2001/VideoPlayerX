var qoeLineGraph = function(){
    _this = this;
    this.init = function(){
        this.ctx = document.getElementById("qoeChart").getContext('2d');
        this.graphObj = new Chart(this.ctx, {
            type: 'line',
            data: {
                datasets: [{
                    fill: false,
                    backgroundColor: 'white',
                    borderColor: 'white',
                    data: []
                }, {
                    fill: false,
                    backgroundColor: 'red',
                    borderColor: 'red',
                    data: []
                }]
            },
            options: {
                maintainAspectRatio: false,
                showScale: false,
                legend: {
                    display: false
                },
                elements: {
                    point: {
                        radius: 0,
                        hitRadius:4,
                        hoverRadius:4
                    }, line: {
                        tension: 0,
                        fill: false
                    }
                },
                title: {
                    display: false,
                    text: 'QoE Scores Over Time'
                },
                scales: {
                    display:true,
                    yAxes: [{
                        display:false,
                        gridLines: {
                            color: "#FFFFFF",
                            lineWidth: 0.75,
                            display:false,
                            drawBorder: false
                        },
                        ticks: {
                            display:false,
                            fontColor: 'white',
                            min: 0,
                            max: 100,
                            stepSize: 20,
                        }
                    }],
                    xAxes: [{
                        display: false,
                        gridLines: {
                            color: "#FFFFFF",
                            display: false
                        },
                        type: 'linear',
                        ticks: {
                            display: false,
                            fontColor: 'white',
                            min: 0,
                            stepSize: 2
                        }
                    }]
                }
            }
        });
    };
    this.sectionNumber = 0;
    this.notifyMaxVideoTime = function(maxTime){
        this.graphObj.options.scales.xAxes[0].ticks.suggestedMax = maxTime;
    };

    this.notifyNewSection = function(){
        this.graphObj.data.datasets.push({
            fill: false,
            backgroundColor: 'white',
            borderColor: 'white',
            data: []
        });
        this.graphObj.data.datasets.push({
            fill: false,
            backgroundColor: 'red',
            borderColor: 'red',
            data: []
        });
        this.sectionNumber += 2;
    };

    this.updateGraph = function(graph, data){
        this.graphObj.data.datasets[graph + this.sectionNumber].data.push(data);
        this.graphObj.update(0);
    };
    this.reset = function(){
        this.graphObj.data.labels = [0];
        this.graphObj.data.datasets.forEach(function(dataset){
            dataset.data = [];
        });
        this.graphObj.options.scales.xAxes[0].ticks.suggestedMax = 2;
        this.graphObj.update(0);
        this.sectionNumber = 0;
    }
};

