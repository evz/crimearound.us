(function(){
    var drawnItems = new L.FeatureGroup();
    var geojson = new L.LayerGroup();
    var map;
    var meta = L.control({position: 'bottomright'});
    var meta_data;
    meta.onAdd = function(map){
        this._div = L.DomUtil.create('div', 'meta');
        return this._div;
    }
    meta.update = function(meta_data){
        if(typeof meta_data !== 'undefined'){
            var tpl = new EJS({url: 'js/views/metaTemplate.ejs?2'});
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
        map = L.mapbox.map('map', 'ericvanzanten.map-7b7muw9h', {attributionControl: false})
            .fitBounds([[41.644286009999995, -87.94010087999999], [42.023134979999995, -87.52366115999999]]);
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
        if(window.location.hash){
            var hash = window.location.hash.slice(1,window.location.hash.length);
            var query = parseParams(hash)
            $.when(get_results(query)).then(
                function(resp){
                    var location = resp['meta']['query']['location']
                    var shape_opts = {
                        stroke: true,
                        color: '#f06eaa',
                        weight: 4,
                        opacity: 0.5,
                        fill: true,
                        fillOpacity: 0.2,
                        clickable: true
                    }
                    var geo = L.geoJson(location['$geoWithin']['$geometry'],{
                        style: function(feature){
                            return shape_opts;
                        }
                    });
                    drawnItems.addLayer(geo);
                    map.fitBounds(geo.getBounds());
                    add_resp_to_map(resp);
                }
            ).fail();
        } else {
            map.fitBounds([[41.644286009999995, -87.94010087999999], [42.023134979999995, -87.52366115999999]]);
        }
       //var geocoder = L.mapbox.geocoderControl('ericvanzanten.map-7b7muw9h');
       //map.addControl(geocoder);
       //geocoder.on('select', function(e){
       //    console.log('uh');
       //})
        var tpl = new EJS({url: 'js/views/filterTemplate.ejs?2'});
        $('#filters').append(tpl.render());
        $('.filter').on('change', function(e){
            geojson.clearLayers();
            drawnItems.eachLayer(function(layer){
                edit_create(layer, map);
            });
        });
        $('#report').on('click', get_report);
        $('#address-search').on('click',function(e){
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
        $('#submit-query').on('click', function(e){
            e.preventDefault();
            $('#map').spin('large');
            if(drawnItems.toGeoJSON().features.length){
                var types = []
                $.each($('#crime-type').val(), function(i, type){
                    types.push(type);
                });
                types = types.join(',');
                locations = [];
                $.each($('#crime-location').val(), function(i, location){
                    locations.push(location);
                });
                locations = locations.join(',');
                drawnItems.eachLayer(function(layer){
                    edit_create(layer, map);
                });
            } else {
                $('#map').spin(false);
                $('#shape-error').reveal();
            }
        })
        $('.chosen-select').chosen();
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

    function parseParams(query){
        var re = /([^&=]+)=?([^&]*)/g;
        var decodeRE = /\+/g;  // Regex for replacing addition symbol with a space
        var decode = function (str) {return decodeURIComponent( str.replace(decodeRE, " ") );};
        var params = {}, e;
        while ( e = re.exec(query) ) {
            var k = decode( e[1] ), v = decode( e[2] );
            if (k.substring(k.length - 2) === '[]') {
                k = k.substring(0, k.length - 2);
                (params[k] || (params[k] = [])).push(v);
            }
            else params[k] = v;
        }
        return params;
    }

    function draw_edit(e){
        var layers = e.layers;
        geojson.clearLayers();
        drawnItems.addLayer(e.layer);
      //layers.eachLayer(function(layer){
      //    edit_create(layer, e.target);
      //})
    }

    function draw_create(e){
        //edit_create(e.layer, e.target)
        drawnItems.addLayer(e.layer);
    }

    function draw_delete(e){
        geojson.clearLayers();
        drawnItems.clearLayers();
        meta.update();
    }

    function edit_create(layer, map){
        $('#map').spin('large')
        var query = {};
        var feature = layer.toGeoJSON();
        if (feature.type == 'FeatureCollection'){
            feature = feature.features[0];
        }
        query['location__geoWithin'] = JSON.stringify(feature['geometry']);
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
        var types = []
        $.each($('#crime-type').val(), function(i, type){
            types.push(type);
        });
        if(types.length > 0){
            query['primary_type'] = types.join(',');
        }
        var locations = [];
        $.each($('#crime-location').val(), function(i, location){
            locations.push(location);
        });
        if(locations.length > 0){
            query['location_description'] = locations.join(',');
        }
        var time_checkboxes = $('.filter.time');
        var on = [];
        $.each(time_checkboxes, function(i, checkbox){
            if($(checkbox).is(':checked')){
                on.push($(checkbox).attr('value'));
            }
        });
        if (on.length > 0){
            query['time'] = on.join(',');
        }
        if(valid){
            $.when(get_results(query)).then(function(resp){
                add_resp_to_map(resp);
                window.location.hash = $.param(query);
            }).fail(function(data){
                console.log(data);
            })
        } else {
            $('#map').spin(false);
            $('#date-error').reveal();
        }
        drawnItems.addLayer(layer);
    }

    function add_resp_to_map(resp){
        var marker_opts = {
            radius: 10,
            weight: 2,
            opacity: 1,
            fillOpacity: 0.6
        };
        $('#map').spin(false);
        meta_data = resp.meta;
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
        var query = JSON.stringify(meta_data.query);
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
