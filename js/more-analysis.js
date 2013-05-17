(function(){
    d3.csv('../data/full_dump.csv')
        .row(
            function(d){
                var format = d3.time.format('%m-%d-%Y');
                var nice_format = d3.time.format('%m/%d/%Y')
                var date_obj = format.parse(d.date);
                return {
                    year: date_obj.getFullYear(),
                    date: nice_format(date_obj),
                    temp_max: d.temp_max,
                    total_count: d.total_count
                }
            }
        ).get(
            function(error, rows){
                init_chart(rows)
            }
        );
    function init_chart(rows){
        rows.forEach(function(d) {
            d.temp_max = +d.temp_max;
            d.total_count = +d.total_count;
        })
        var el_width = document.getElementById('chart').clientWidth;
        var margin = {top: 20, right: 40, bottom: 50, left: 60},
            width = el_width - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        var x = d3.scale.linear().range([0, width]);
        var y = d3.scale.linear().range([height, 0]);
        var color = d3.scale.category20b();
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        var yAxis = d3.svg.axis().scale(y).orient('left');

        y.domain(d3.extent(rows, function(d){return d.total_count;}));
        x.domain(d3.extent(rows, function(d){return d.temp_max;}));

        var line = d3.svg.line()
            .y(function(d){return y(d.total_count)})
            .x(function(d){return x(d.temp_max)});

        var svg = d3.select('#chart').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);
        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);
        svg.append('text')
            .attr({'id': 'dataLabel', 'x': width - 20, 'y': height - 20, 'text-anchor': 'end' })
            .style({'font-size': '24px', 'font-weight': '300', 'fill': '#000'})
        svg.selectAll(".dot")
          .data(rows)
          .enter().append("circle")
          .attr("class", function(d){return 'dot ' + d.year})
          .attr("r", 4)
          .attr("cx", function(d) { return x(d.temp_max); })
          .attr("cy", function(d) { return y(d.total_count); })
          .style("fill", function(d) { return color(d.year); })
          .style("opacity", 0.5)
          .on('mouseover', function(d){
              d3.select(this).attr('r', 8)
              d3.select('svg g #dataLabel')
                  .text('Date: ' + d.date + ', Temperature: ' + Math.round(d.temp_max * 100) / 100 + '°F , ' + 'Crimes: ' + Math.round(d.total_count * 100) / 100)
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
          svg.append('path')
              .data(rows)
              .attr('class', 'crime-line')
              .attr('d', line);
          var legend = svg.selectAll(".legend")
              .data(color.domain())
              .enter().append("g")
              .attr("class", "legend")
              .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

          legend.append("rect")
              .attr("x", width - 18)
              .attr("width", 18)
              .attr("height", 18)
              .style("fill", color);

          legend.append("text")
              .attr("x", width - 24)
              .attr("y", 9)
              .attr("dy", ".35em")
              .style("text-anchor", "end")
              .text(function(d) { return d; });
        d3.selectAll('input').on('click', function(d){
            d3.selectAll('.dot.' + d.year)
                .transition()
                .duration(500)
                .style("opacity", 1)
            console.log('here')
        });
    }
})()
