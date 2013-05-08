(function(){
    $(document).ready(function(){
        $.getJSON('/data/weather/total.json', function(data){
            init_chart(data.data);
        });
        $('.filter').on('click', function(e){
            e.preventDefault();
            $('.filter').removeClass('active');
            $(this).addClass('active');
            var filter = $(this).find('a').attr('href').substr(1);
            $.getJSON('/data/weather/' + filter + '.json', function(data){
                $('#chart').empty()
                init_chart(data.data);
            })
        })

    })

    function init_chart(data){
        var el_width = $('#chart').width();
        var margin = {top: 20, right: 40, bottom: 50, left: 60},
            width = el_width - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        var x = d3.scale.linear().range([0, width]);
        var y = d3.scale.linear().range([height, 0]);

        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        var yAxis = d3.svg.axis().scale(y).orient('left');

        var line = d3.svg.line()
            .y(function(d){return y(d.average)})
            .x(function(d){return x(d.temp)});

        var svg = d3.select('#chart').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        y.domain(d3.extent(data, function(d){return d.average;}));
        x.domain(d3.extent(data, function(d){return d.temp;}))
        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);
        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis)
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr({'y': -50, 'x': -160, 'text-anchor': 'middle'})
            .style({'font-size': '15px', 'font-weight': '300', 'fill': '#555'})
            .text('Average number of crimes');
        svg.append('text')
            .attr({'y': height + 40, 'x': width / 2, 'text-anchor': 'middle'})
            .style({'font-size': '15px', 'font-weight': '300', 'fill': '#555'})
            .text('Degrees Fahrenheit');
        var label_size = Math.round(width * 0.04)
        svg.append('text')
            .attr({'id': 'dataLabel', 'x': width - 20, 'y': height - 20, 'text-anchor': 'end' })
            .style({'font-size': label_size + 'px', 'font-weight': '300', 'fill': '#000'})
        svg.append('path')
            .datum(data)
            .attr('class', 'crime-line')
            .attr('d', line);
        svg.selectAll('.point')
            .data(data)
            .enter().append('svg:circle')
            .attr('class', 'point')
            .attr('r', 4)
            .attr('cx', function(d,i){return x(d.temp)})
            .attr('cy', function(d,i){return y(d.average)})
            .on('mouseover', function(d){
                d3.select(this).attr('r', 8)
                d3.select('svg g #dataLabel')
                    .text('Temperature: ' + d.temp + '°F , ' + 'Crimes: ' + Math.round(d.average * 100) / 100)
                    .transition()
                    .duration(500)
                    .style('opacity', 1)
            })
            .on('mouseout', function(d){
                d3.select(this).attr('r', 4);
                d3.select('svg g #dataLabel')
                    .transition()
                    .duration(500)
                    .style('opacity', 0)
            })
    }
})()
