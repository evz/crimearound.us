(function(){
    var drawnItems = new L.FeatureGroup();
    var geojson = new L.LayerGroup();
    var map;
    var meta = L.control({position: 'bottomright'});
    meta.onAdd = function(map){
        this._div = L.DomUtil.create('div', 'meta');
        return this._div;
    }
    meta.update = function(meta_data){
        if(typeof meta_data !== 'undefined'){
            var tpl = new EJS({url: 'js/views/metaTemplate.ejs'});
            $(this._div).html(tpl.render(meta_data.totals_by_type));
        } else {
            $(this._div).empty();
            meta.removeFrom(map);
        }
    }
    //var endpoint = 'http://localhost:7777';
    var endpoint = 'http://crime-weather.smartchicagoapps.org';
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
            map = new L.Map('map', {attributionControl: false})
                .addLayer(new wax.leaf.connector(tiles));
            if(window.location.hash){
                var location = window.location.hash.split(',')
                var center = new L.LatLng(location[1], location[2])
                var zoom = location[0].replace('#', '')
                map.setView(center, parseInt(zoom));
            } else {
                map.fitBounds([[41.644286009999995, -87.94010087999999], [42.023134979999995, -87.52366115999999]]);
            }
            var attribution = new L.Control.Attribution();
            attribution.addAttribution("Geocoding data &copy; 2013 <a href='http://open.mapquestapi.com'>MapQuest, Inc.</a> | ");
            attribution.addAttribution("Tiles from <a href='http://mapbox.com/about/maps/'>MapBox</a> | ");
            attribution.addAttribution("Map data © <a href='http://www.openstreetmap.org/'>OpenStreetMap</a> contributors, <a href='http://creativecommons.org/licenses/by-sa/2.0/'>CC-BY-SA.</a>");
            map.addControl(attribution);
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
            $('#report').on('click', get_report);
            $('.search').on('click',function(e){
                e.preventDefault();
                $('#refine').empty()
                var query = $(this).prev().val() + ' Chicago, IL';
                var bbox = "42.023134979999995,-87.52366115999999,41.644286009999995,-87.94010087999999";
                var params = {
                    key: 'Fmjtd|luub2d0rn1,rw=o5-9u2ggw',
                    location: query,
                    boundingBox: bbox
                }
                $.ajax({
                    url:'http://open.mapquestapi.com/geocoding/v1/address',
                    data: params,
                    dataType: 'jsonp',
                    success: handle_geocode
                });
            });
        })
    });

    function handle_geocode(data){
        var locations = data.results[0].locations;
        if (locations.length == 1) {
            var latlng = [locations[0].latLng.lat, locations[0].latLng.lng];
            map.setView(latlng, 17);
            L.marker(latlng).addTo(map);
        } else if (locations.length > 1) {
            var tpl = new EJS({url: 'js/views/searchRefine.ejs'});
            $('#refine').append(tpl.render({locations:locations}))
            $('.refine-search').on('click', function(e){
                e.preventDefault();
                var data = $(this).parent().data('latlng').split(',');
                var latlng = [parseFloat(data[0]), parseFloat(data[1])];
                map.setView(latlng, 17);
                L.marker(latlng).addTo(map);
            })
        } else {
            $('#refine').append("<p>Your search didn't return any results.</p>");
        }
    }

    function draw_edit(e){
        var layers = e.layers;
        geojson.clearLayers();
        layers.eachLayer(function(layer){
            edit_create(layer, e.target);
        })
    }

    function draw_create(e){
        edit_create(e.layer, e.target)
    }

    function draw_delete(e){
        geojson.clearLayers();
        meta.update();
    }

    function edit_create(layer, map){
        $('#map').spin('large')
        var query = {};
        query['location__geoWithin'] = JSON.stringify(layer.toGeoJSON());
        var start = $('.start').val().replace('Start Date: ', '');
        var end = $('.end').val().replace('End Date: ', '');
        start = moment(start)
        end = moment(end)
        var valid = false;
        if (start.isValid() && end.isValid()){
            start = start.startOf('day').unix();
            end = end.endOf('day').unix();
            valid = true;
        }
        query['date__lte'] = end;
        query['date__gte'] = start;
        var on = [];
        var type_checkboxes = $('.filter.type');
        $.each(type_checkboxes, function(i, checkbox){
            if($(checkbox).is(':checked')){
                on.push($(checkbox).attr('value'));
            }
        });
        query['type'] = on.join(',')
        on = [];
        var time_checkboxes = $('.filter.time');
        $.each(time_checkboxes, function(i, checkbox){
            if($(checkbox).is(':checked')){
                on.push($(checkbox).attr('value'));
            }
        });
        query['time'] = on.join(',')
        var marker_opts = {
            radius: 10,
            weight: 2,
            opacity: 1,
            fillOpacity: 0.6
        };
        if(valid){
            $.when(get_results(query)).then(function(resp){
                $('#map').spin(false);
                var meta_data = resp.meta;
                if($('.meta.leaflet-control').length){
                    meta.removeFrom(map);
                }
                meta.addTo(map);
                meta.update(meta_data);
                $.each(resp.results, function(i, result){
                    var location = result.location;
                    location.properties = result;
                    geojson.addLayer(L.geoJson(location, {
                        pointToLayer: function(feature, latlng){
                            if (feature.properties.type == 'violent'){
                                marker_opts.color = '#7B3294';
                                marker_opts.fillColor = '#7B3294';
                            } else if (feature.properties.type == 'property'){
                                marker_opts.color = '#ca0020';
                                marker_opts.fillColor = '#ca0020';
                            } else {
                                marker_opts.color = '#008837';
                                marker_opts.fillColor = '#008837';
                            }
                            return L.circleMarker(latlng, marker_opts)
                        },
                        onEachFeature: bind_popup
                    })).addTo(map);
                });
            }).fail(function(data){
                console.log(data);
            })
        } else {
            $('#map').spin(false);
            $('#date-error').reveal();
        }
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

    function get_report(){
        var query = JSON.stringify(meta.query);
        if (typeof query !== 'undefined'){
            $.fileDownload(endpoint + '/api/report/?query=' + query, {
                successCallback: function(url){
                },
                errorCallback: function(html, url){
                }
            })
        } else {
            $('#report-modal').reveal()
        }
    }

    function get_results(query){
        return $.ajax({
            url: endpoint + '/api/crime/',
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
