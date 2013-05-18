(function(){
    var map;
    Array.range= function(a, b, step){
        var A = [];
        A[0] = a;
        step = step || 1;
        while(a+step <= b){
            A[A.length] = a+= step;
        }
        return A;
    }
    $(document).ready(function(){
        $('.full-height').height(window.innerHeight - 45);
        window.onresize = function(event){
            resize_junk();
        }
        map = L.mapbox.map('map', 'ericvanzanten.map-7b7muw9h').setView([41.83733944214672, -87.64171600341797], 11);
        load_map();
    })

    function resize_junk(){
        $('.full-height').height(window.innerHeight - 45);
        var offset = $('#overlay-top').height() + $('#crime-title').height() + 75;
        $('.hide-overflow').height(window.innerHeight - offset);
    }

    function load_map(){
        $('.full-height').height(window.innerHeight-45);
        var then = moment().subtract('days', 9);
        var y = then.format('YYYY');
        var m = then.format('M');
        var d = then.format('D');
        var date_str = then.format('MM-DD-YYYY')
        var url = 'data/' + y + '/' + m + '/' + d + '.json';
        fetch_and_load(url, date_str);
    }

    function fetch_and_load(url, date_str){
        var tpl = new EJS({url: 'js/views/dataTemplate.ejs'});
        $('#map').spin('large')
        $.getJSON(url, function(data){
            $('#map').spin(false);
            var marker_layer = L.mapbox.markerLayer(data.geojson).addTo(map);
            marker_layer.eachLayer(function(marker){
                bind_popup(marker);
            })
            data.date = date_str;
            var html = tpl.render(data);
            $('#overlay').html(html);
            $('.filter').on('change', function(e){
                filter_markers(marker_layer);
            });
            $('.date-select').unbind('change');
            $('.date-select').on('change', function(e){
                var day = $('#day').val();
                var month = $('#month').val();
                var year = $('#year').val();
                var date_str = moment(month + ' ' +  day + ' ' + year, 'M D YYYY').format('MM-DD-YYYY');
                var url = 'data/' + year + '/' + month + '/' + day + '.json';
                map.removeLayer(marker_layer);
                fetch_and_load(url, date_str);
            });
            resize_junk();
        }).fail(function(resp){
            $('#map').spin(false);
            var error_template = new EJS({url: 'js/views/errorTemplate.ejs'});
            var error_html = error_template.render({date: date_str});
            $('#overlay').html(error_html);
            $('.date-select').unbind('change');
            $('.date-select').on('change', function(e){
                var day = $('#day').val();
                var month = $('#month').val();
                var year = $('#year').val();
                var date_str = moment(month + ' ' +  day + ' ' + year, 'M D YYYY').format('MM-DD-YYYY');
                var url = 'data/' + year + '/' + month + '/' + day + '.json';
                fetch_and_load(url, date_str);
            });
        });
    }

    function filter_markers(marker_layer){
        var on = [];
        var checkboxes = $('.filter');
        $.each(checkboxes, function(i, checkbox){
            if($(checkbox).is(':checked')){
                on.push($(checkbox).attr('name'));
            }
        });
        marker_layer.setFilter(function(f){
            return on.indexOf(f.properties['key']) !== -1;
        });
        marker_layer.eachLayer(function(marker){
            bind_popup(marker);
        })
        return false;
    }

    function bind_popup(marker){
        var crime_template = new EJS({url: 'js/views/crimeTemplate.ejs'});
        var props = marker.feature.properties;
        var pop_content = crime_template.render(props);
        marker.bindPopup(pop_content, {
            closeButton: true,
            minWidth: 320
        })
    }

})()
