(function(){
    var drawnItems = new L.FeatureGroup();
    var geojson = new L.LayerGroup();
    $(document).ready(function(){
        $('.full-height').height(window.innerHeight - 45);
        window.onresize = function(event){
            resize_junk();
        }
        var tiles_url = 'http://a.tiles.mapbox.com/v3/ericvanzanten.map-7b7muw9h.jsonp';
        wax.tilejson(tiles_url, function(tilejson){
            var tiles = {
                tilejson: tilejson.tilejson,
                tiles: tilejson.tiles
            }
            var map = new L.Map('map')
                .addLayer(new wax.leaf.connector(tiles));
            if(window.location.hash){
                var location = window.location.hash.split(',')
                var center = new L.LatLng(location[1], location[2])
                var zoom = location[0].replace('#', '')
                map.setView(center, parseInt(zoom));
            } else {
                map.fitBounds([[41.644286009999995, -87.94010087999999], [42.023134979999995, -87.52366115999999]]);
            }
            map.addLayer(drawnItems);
            var drawControl = new L.Control.Draw({
                edit: {
                        featureGroup: drawnItems
                    },
                draw: {
                    polyline: false,
                    circle: false,
                    marker: false
                }
            });
            map.addControl(drawControl);
            map.on('draw:created', draw_create);
            map.on('draw:edited', draw_edit);
            map.on('draw:deleted', draw_delete);
            map.on('moveend', function(e){
                var center = e.target.getCenter();
                var zoom = e.target.getZoom();
                window.location.hash = zoom + ',' + center.lat + ',' + center.lng;
            })
            var tpl = new EJS({url: 'js/views/filterTemplate.ejs'});
            $('#filters').append(tpl.render());
            $('.filter').on('change', function(e){
                geojson.clearLayers();
                drawnItems.eachLayer(function(layer){
                    edit_create(layer, map);
                });
            });
        })
    });

    function draw_edit(e){
        var layers = e.layers;
        layers.eachLayer(function(layer){
            edit_create(layer, e.target);
        })
    }

    function draw_create(e){
        edit_create(e.layer, e.target)
    }

    function draw_delete(e){
        geojson.clearLayers();
    }

    function edit_create(layer, map){
        $('#map').spin('large')
        var query = {};
        query['location__geoWithin'] = JSON.stringify(layer.toGeoJSON());
        var start = $('.start').val().replace('Start Date: ', '');
        var end = $('.end').val().replace('End Date: ', '');
        start = moment(start).startOf('day').unix();
        end = moment(end).endOf('day').unix();
        query['date__lte'] = end;
        query['date__gte'] = start;
        var on = [];
        var checkboxes = $('.filter.type');
        $.each(checkboxes, function(i, checkbox){
            if($(checkbox).is(':checked')){
                on.push($(checkbox).attr('value'));
            }
        });
        var marker_opts = {
            radius: 10,
            fillColor: "#2109a8",
            color: "#2109a8",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.6
        };
        $.when(get_results(query)).then(function(resp){
            $('#map').spin(false);
            $.each(resp.results, function(i, result){
                var location = result.location;
                location.properties = result;
                geojson.addLayer(L.geoJson(location, {
                    pointToLayer: function(feature, latlng){
                        return L.circleMarker(latlng, marker_opts)
                    },
                    onEachFeature: bind_popup
                })).addTo(map);
            })
        }).fail(function(data){
            console.log(data);
        })
        drawnItems.addLayer(layer);
    }

    function bind_popup(feature, layer){
        var crime_template = new EJS({url: 'js/views/crimeTemplate.ejs'});
        var props = feature.properties;
        var pop_content = crime_template.render(props);
        layer.bindPopup(pop_content, {
            closeButton: true,
            minWidth: 320
        })
    }

    function filter_markers(marker_layer){

    }

    function get_results(query){
        return $.ajax({
            url: 'http://crime-weather.smartchicagoapps.org/api/crime/',
            dataType: 'jsonp',
            data: query,
        })
    }

    function resize_junk(){
        $('.full-height').height(window.innerHeight - 45);
        //var offset = $('#overlay-top').height() + $('#crime-title').height() + 75;
        //$('.hide-overflow').height(window.innerHeight - offset);
    }
})()
