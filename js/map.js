(function(){
    var map;
    $(document).ready(function(){
        $('.full-height').height(window.innerHeight - 45);
        window.onresize = function(event){
            $('.full-height').height(window.innerHeight - 45);
        }
        map = L.mapbox.map('map', 'ericvanzanten.map-7b7muw9h').setView([41.886304, -87.637768], 13);
        map.on('move', update_hash);
        if (window.location.hash){
            var hash = window.location.hash.substring(1).split(',');
            var position = {'coords':{'latitude': hash[1], 'longitude': hash[2]}, 'zoom': hash[0]}
            map_success(position);
        } else {
            reset_map();
        }
    })

    function map_success(position){
        $('.full-height').height(window.innerHeight-45);
        var zoom = 13;
        if (position.zoom){
            zoom = position.zoom
        }
        map.setView([position.coords.latitude, position.coords.longitude], zoom);
        window.location.hash = zoom + ',' + position.coords.latitude + ',' + position.coords.longitude;
        var then = moment().subtract('days', 9);
        var y = then.format('YYYY');
        var m = then.format('M');
        var d = then.format('D');
        var date_str = then.format('MM-DD-YYYY')
        var url = 'data/' + y + '/' + m + '/' + d + '.json';
        var tpl = new EJS({url: 'js/views/dataTemplate.ejs'});
        $.getJSON(url, function(data){
            var marker_layer = L.mapbox.markerLayer(data.geojson).addTo(map);
            var crime_template = new EJS({url: 'js/views/crimeTemplate.ejs'});
            marker_layer.eachLayer(function(marker){
                var props = marker.feature.properties;
                var pop_content = crime_template.render(props);
                console.log(pop_content);
                marker.bindPopup(pop_content, {
                    closeButton: true,
                    minWidth: 320
                })
            })
            data.date = date_str;
            var html = tpl.render(data);
            $('#overlay').html(html);
            //filter_markers(marker_layer);
            $('.filter').on('change', function(e){
                filter_markers(marker_layer);
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
        return false;
    }

    function update_hash(e){
        var zoom = map.getZoom();
        var center = map.getCenter();
        window.location.hash = zoom + ',' + center.lat + ',' + center.lng;
        map.panTo(center);
    }

    function map_error(){
        console.log('map error');
    }

    function reset_map(){
        var full_height = 200;
        if (window.innerHeight != undefined){
            full_height = window.innerHeight
        } else {
            full_height = document.body.clientHeight;
        }
        $('.full-height').height(full_height-45);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(map_success, map_error);
        } else {
            map_error();
        }
    }
})()
