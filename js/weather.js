(function(){
    $(document).ready(function(){
        $.each($('.chart'), function(i, chart){
            var key = $(chart).attr('id');
            var chartopts = {
                chart: {
                    type: 'spline'
                },
                title: {
                    text: key
                },
                xAxis: {
                    min: -10,
                    max: 120
                },
                yAxis: {
                    title: { text:'Crime count'}
                },
                series: [{data:[]}]
            }
            $.getJSON('/data/weather/' + key + '.json', function(data){
                $.each(data['data'], function(i, stuff){
                    var inp = [stuff['temp'], stuff['average']];
                    chartopts['series'][0]['data'].push(inp)

                })
            });
            $(chart).highcharts(chartopts);
        })
    });
})()
