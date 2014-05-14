(function(){
    var drawnItems = new L.FeatureGroup();
    var crimes = new L.FeatureGroup();
    var beats = new L.FeatureGroup();
    var map;
    var oms;
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
    //var endpoint = 'http://33.33.33.66:7777';
    var endpoint = 'http://crime-weather.smartchicagoapps.org';
    var AddressSearch = L.Control.extend({
        options: {
            position: 'topleft',
            keepOpen: false,
        },
        _toggle: function(e) {
            if (e) L.DomEvent.stop(e);
            if (L.DomUtil.hasClass(this._container, 'active')) {
                L.DomUtil.removeClass(this._container, 'active');
                this._results.innerHTML = '';
                this._input.blur();
            } else {
                L.DomUtil.addClass(this._container, 'active');
                this._input.focus();
                this._input.select();
            }
        },
        _closeIfOpen: function(e) {
            if (L.DomUtil.hasClass(this._container, 'active') &&
                !this.options.keepOpen) {
                L.DomUtil.removeClass(this._container, 'active');
                this._results.innerHTML = '';
                this._input.blur();
            }
        },
        onAdd: function(map) {
            var container = L.DomUtil.create('div', 'leaflet-control-mapbox-geocoder leaflet-bar leaflet-control'),
                link = L.DomUtil.create('a', 'leaflet-control-mapbox-geocoder-toggle mapbox-icon mapbox-icon-geocoder', container),
                results = L.DomUtil.create('div', 'leaflet-control-mapbox-geocoder-results', container),
                wrap = L.DomUtil.create('div', 'leaflet-control-mapbox-geocoder-wrap', container),
                form = L.DomUtil.create('form', 'leaflet-control-mapbox-geocoder-form', wrap),
                input  = L.DomUtil.create('input', '', form);

            link.href = '#';
            link.innerHTML = '&nbsp;';

            input.type = 'text';
            input.setAttribute('placeholder', 'Search');

            L.DomEvent.addListener(form, 'submit', this._geocode, this);
            L.DomEvent.disableClickPropagation(container);

            this._map = map;
            this._input = input;
            this._form = form;
            this._results = results;

            if (this.options.keepOpen) {
                L.DomUtil.addClass(container, 'active');
            } else {
                this._map.on('click', this._closeIfOpen, this);
                L.DomEvent.addListener(link, 'click', this._toggle, this);
            }
            return container;
        },
        _geocode: function(e){
            L.DomEvent.preventDefault(e);
            L.DomUtil.addClass(this._container, 'searching');
            var map = this._map;
            var container = this._container;
            var results = this._results;
            var self = this;
            var onload = L.bind(function(resp, err){
                L.DomUtil.removeClass(container, 'searching');
                results.innerHTML = '';
                var locations = resp.results[0].locations;
                if (locations.length === 1){
                    var latlng = [locations[0].latLng.lat, locations[0].latLng.lng];
                    map.setView(latlng, 17);
                    var mark = L.marker(latlng)
                    mark.addTo(map);
                    //self._fetch_near(mark); //Add in the $near query
                } else {
                    for (var i = 0, l = Math.min(locations.length, 5); i < l; i++) {
                        var name = [];
                        if (locations[i].street) name.push(locations[i].street);
                        if (!name.length) continue;

                        var r = L.DomUtil.create('a', '', this._results);
                        r.innerHTML = name.join(', ');
                        r.href = '#';

                        (L.bind(function(result) {
                            L.DomEvent.addListener(r, 'click', function(e) {
                                var lat = result.latLng.lat;
                                var lng = result.latLng.lng;
                                map.setView(L.latLng(lat, lng), 16);
                                var mark = L.marker([lat,lng]);
                                mark.addTo(map);
                                L.DomEvent.stop(e);
                                self._toggle();
                                //self._fetch_near(mark);
                                // add in the $near query
                            }, this);
                        }, this))(locations[i]);
                    }
                    if (resp.results.length > 5) {
                        var outof = L.DomUtil.create('span', '', this._results);
                        outof.innerHTML = 'Top 5 of ' + locations.length + '  results';
                    }
                }
            }, this);
            var query = this._input.value + ' Chicago, IL';
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
                success: onload
            });
        },
        _fetch_near: function(point){
            var geo = point.toGeoJSON()['geometry'];
            var query = {};
            query['location__nearSphere'] = JSON.stringify(geo);
            query['maxDistance'] = 500;
            var start = $('.start').val().replace('Start Date: ', '');
            var end = $('.end').val().replace('End Date: ', '');
            start = moment(start)
            end = moment(end)
            start = start.startOf('day').unix();
            end = end.endOf('day').unix();
            query['date__lte'] = end;
            query['date__gte'] = start;
            $.when(get_results(query)).then(
                function(resp){
                    add_resp_to_map(query, resp);
                    if (crimes.getLayers().length > 0){
                        map.fitBounds(crimes.getBounds());
                    }
                }
            )
        }
    });
    $(document).ready(function(){
        $('.full-height').height(window.innerHeight - 45);
        window.onresize = function(event){
            resize_junk();
        }
        map = L.mapbox.map('map', 'datamade.hnmob3j3', {attributionControl: false})
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
        drawControl.setPosition('topright')
        map.addControl(drawControl);
        map.on('draw:created', draw_create);
        map.on('draw:edited', draw_edit);
        map.on('draw:deleted', draw_delete);
        if(window.location.hash){
            var hash = window.location.hash.slice(1,window.location.hash.length);
            var query = parseParams(hash);
            $('#map').spin('large');
            $.when(get_results(query)).then(
                function(resp){
                    reload_state(query, resp);
                }
            ).fail();
        } else {
            map.fitBounds([[41.644286009999995, -87.94010087999999], [42.023134979999995, -87.52366115999999]]);
        }

        oms = new OverlappingMarkerSpiderfier(map);
        oms.addListener('click', bind_popup);
        oms.addListener('unspiderfy', function(markers){
            console.log(markers);
        });
        oms.unspiderfy()

        map.addControl(new AddressSearch().setPosition('topright'));
        $('.start').val(moment().subtract('d', 14).format('MM/DD/YYYY'));
        $('.end').val(moment().subtract('d', 7).format('MM/DD/YYYY'));
        $.getJSON('js/beats.json?2', function(resp){
            var beat_select = "<select id='police-beat' data-placeholder='Police Beat ...' class='chosen-select' multiple>";
            var keys = [];
            for (k in resp){
                if (resp.hasOwnProperty(k)){
                    keys.push(k)
                }
            }
            keys.sort();
            sorted_resp = {};
            for (i = 0; i < keys.length; i++){
                var k = keys[i];
                sorted_resp[k] = resp[k];
            }
            $.each(sorted_resp, function(district, beats){
                beat_select += "<optgroup label='" + district + "'>";
                $.each(beats, function(i, beat){
                    beat_select += "<option value='" + beat + "'>" + beat + "</option>";
                })
                beat_select += "</optgroup>";
            });
            beat_select += "</select>";
            $('#beat-filters').append(beat_select);
            $('.chosen-select').chosen();
            $('#submit-query').on('click', function(e){
                e.preventDefault();
                edit_create();
            });
            $('#reset').on('click', function(e){
                e.preventDefault();
                window.location.hash = '';
                window.location.reload();
            });
        });
        $('.date-filter').datepicker({
            dayNamesMin: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            prevText: '',
            nextText: ''
        });
        $('#time-slider').slider({
            orientation: "horizontal",
            range: true,
            min: 0,
            max: 23,
            values: [0,23],
            slide: function(event, ui){
                var s = ui.values[0]
                var e = ui.values[1]
                var start = convertTime(s);
                var end = convertTime(e);
                $('#time-start').html(start);
                $('#time-end').html(end);
                $('#time-start').data('value', s);
                $('#time-end').data('value', e);
            }
        });
        if (typeof $.cookie('crimearound_us') === 'undefined'){
            $.cookie('crimearound_us', JSON.stringify([]), {
                json: true,
                expires: 365
            });
        } else {
            var saves = $.cookie('crimearound_us');
            saves = $.parseJSON(saves);
            if (saves.length > 0){
                var item = '<li class="has-dropdown"><a href="#">Remembered searches</a><ul class="dropdown saved-searches">';
                $.each(saves, function(i, save){
                    item += '<li><a class="saved-search" href="javascript://">' + save.name + '</a>'
                    item += '<a href="javascript://" class="delete-search"><i class="foundicon-remove"></i></a></li>'
                })
                item += '</ul></li>';
                $('#right-nav').prepend(item);
                $('.saved-search').on('click', load_remembered_search);
                $('.delete-search').on('click', delete_search);
            }
        }
    });

    function convertTime(time){
        var meridian = time < 12 ? 'am' : 'pm';
        var hour = time % 12 || 12;
        return hour + meridian;
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
        crimes.clearLayers();
        layers.eachLayer(function(layer){
            drawnItems.addLayer(layer);
        });
    }

    function draw_create(e){
        drawnItems.addLayer(e.layer);
    }

    function draw_delete(e){
        crimes.clearLayers();
        drawnItems.clearLayers();
        meta.update();
    }

    function edit_create(){
        $('#map').spin('large')
        var query = {};
        var layers = drawnItems.getLayers();
        if (layers.length > 0){
            drawnItems.eachLayer(function(layer){
                query['location__geoWithin'] = JSON.stringify(layer.toGeoJSON()['geometry']);
            })
        }
        var start = $('.start').val().replace('Start Date: ', '');
        var end = $('.end').val().replace('End Date: ', '');
        start = moment(start)
        end = moment(end)
        var date_valid = false;
        if (start.isValid() && end.isValid()){
            start = start.startOf('day').unix();
            end = end.endOf('day').unix();
            date_valid = true;
        }
        query['date__lte'] = end;
        query['date__gte'] = start;
        var time_start = $('#time-start').data('value');
        var time_end = $('#time-end').data('value');
        var times = [time_start, time_end];
        query['time'] = times.join(',');
        if($('#crime-type').val()){
            var types = []
            $.each($('#crime-type').val(), function(i, type){
                types.push(type);
            });
            if(types.length > 0){
                query['primary_type'] = types.join(',');
            }
        }
        if ($('#crime-location').val()){
            var locations = [];
            $.each($('#crime-location').val(), function(i, location){
                locations.push(location);
            });
            if(locations.length > 0){
                query['location_description'] = locations.join(',');
            }
        }
        if ($('#police-beat').val()){
            var bts = [];
            $.each($('#police-beat').val(), function(i, beat){
                bts.push(beat);
            });
            if(bts.length > 0){
                query['beat'] = bts.join(',');
            }
        }
        if(date_valid){
            $.when(get_results(query)).then(function(resp){
                if (typeof resp.meta.query.beat !== 'undefined'){
                    add_beats(resp.meta.query.beat['$in']);
                }
                add_resp_to_map(query, resp);
                if (beats.getLayers().length > 0){
                    map.fitBounds(beats.getBounds());
                } else if (crimes.getLayers().length > 0){
                    map.fitBounds(crimes.getBounds());
                }
            }).fail(function(data){
                console.log(data);
            })
        } else {
            $('#map').spin(false);
            $('#date-error').reveal();
        }
    }

    function add_beats(b){
        beats.clearLayers();
        $.each(b, function(i, beat){
            $.getJSON('/data/beats/' + beat + '.geojson', function(geo){
                beats.addLayer(L.geoJson(geo, {
                    style: function(){
                        return {
                            stroke: true,
                            color: '#7B3294',
                            weight: 4,
                            opacity: 0.9,
                            fill: false
                        }
                    }
                }))
            })
        });
        map.addLayer(beats, true);
    }

    function add_resp_to_map(query, resp){
        crimes.clearLayers();
        var marker_opts = {
            radius: 8,
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
        var geo = []
        $.each(resp.results, function(i, result){
            var location = result.location;
            geo.push(location);
            location.properties = result;
            crimes.addLayer(L.geoJson(location, {
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
                    var mark = L.circleMarker(latlng, marker_opts);
                    oms.addMarker(mark);
                    return mark;
                }//,
                //onEachFeature: bind_popup
            }));
        });
        map.addLayer(crimes);
        $('#report').show();
        $('#report').each(function(r){
            if(typeof $._data(this, 'events') === 'undefined'){
                $('#report').on('click', get_report);
            }
        })
        $('#remember').show();
        $('#remember').each(function(r){
            if(typeof $._data(this, 'events') === 'undefined'){
                $('#remember').on('click', remember_search);
            }
        })

        $('#print').show();
        $('#print').each(function(r){
            if(typeof $._data(this, 'events') === 'undefined'){
                $('#print').on('click', print);
            }
        })
        window.location.hash = $.param(query);
    }

    function reload_state(query, resp){
        $('#map').spin(false);
        var location = resp['meta']['query']['location'];
        if (typeof location !== 'undefined'){
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
        }
        var start = query['date__gte'];
        var end = query['date__lte'];
        $('.start').val(moment(start, 'X').format('MM/DD/YYYY'));
        $('.end').val(moment(end, 'X').format('MM/DD/YYYY'));
        if(typeof query['beat'] !== 'undefined'){
            $.each(query['beat'].split(','), function(i, beat){
                $('#police-beat').find('[value="' + beat + '"]').attr('selected', 'selected');
            });
            $('#police-beat').trigger('chosen:updated');
        }
        if(typeof query['primary_type'] !== 'undefined'){
            $.each(query['primary_type'].split(','), function(i, pt){
                $('#crime-type').find('[value="' + pt + '"]').attr('selected', 'selected');
            });
            $('#crime-type').trigger('chosen:updated');
        }
        if(typeof query['location_description'] !== 'undefined'){
            $.each(query['location_description'].split(','), function(i, loc){
                $('#crime-location').find('[value="' + loc + '"]').attr('selected', 'selected');
            });
            $('#crime-location').trigger('chosen:updated');
        }
        if(typeof query['time'] !== 'undefined'){
            var times = query['time'].split(',');
            var s = times[0];
            var e = times[1];
            var start = convertTime(s);
            var end = convertTime(e);
            $('#time-start').html(start);
            $('#time-end').html(end);
            $('#time-start').data('value', s);
            $('#time-end').data('value', e);
            $('#time-slider').slider('values', 0, s);
            $('#time-slider').slider('values', 1, e);
        }
        if (typeof resp.meta.query.beat !== 'undefined'){
            add_beats(resp.meta.query.beat['$in']);
        }
        add_resp_to_map(query, resp);
        if (beats.getLayers().length > 0){
            map.fitBounds(beats.getBounds());
        } else if (crimes.getLayers().length > 0){
            map.fitBounds(crimes.getBounds());
        }
    }

    function remember_search(){
        var hash = window.location.hash.slice(1,window.location.hash.length);
        var query = parseParams(hash);
        query['name'] = moment().format('MMM D, YYYY h:mm:ssa')
        var cookie_val = $.parseJSON($.cookie('crimearound_us'));
        cookie_val.push(query);
        $.cookie('crimearound_us', JSON.stringify(cookie_val));
        if($('#remember').find('i.foundicon-checkmark').length > 0){
            $('#remember i.foundicon-checkmark').hide(500);
            $('#remember i.foundicon-checkmark').remove();
        }
        $('#remember').append('<i class="foundicon-checkmark" style="display:none; color:#008837;"> </i>');
        $('#remember i.foundicon-checkmark').show(500);
        var item = '';
        if($('#right-nav').find('ul.dropdown').length > 0){
            item += '<li><a class="saved-search" href="javascript://">' + query['name'] + '</a>'
            item += '<a href="javascript://" class="delete-search"><i class="foundicon-remove"></i></a></li>'
            $('#right-nav').find('ul.dropdown').append(item);
        } else {
            item += '<li class="has-dropdown"><a href="#">Remembered searches</a><ul class="dropdown">';
            item += '<li><a class="saved-search" href="javascript://">' + query['name'] + '</a>'
            item += '<a href="javascript://" class="delete-search"><i class="foundicon-remove"></i></a></li>'
            item += '</ul></li>';
            $('#right-nav').prepend(item);
        }
        $('.saved-search').each(function(r){
            if(typeof $._data(this, 'events') === 'undefined'){
                $(this).on('click', load_remembered_search);
            }
        })
        $('.delete-search').each(function(r){
            if(typeof $._data(this, 'events') === 'undefined'){
                $(this).on('click', delete_search);
            }
        })
    }

    function delete_search(e){
        var name = $(e.currentTarget).prev().text();
        var cookie_val = $.parseJSON($.cookie('crimearound_us'));
        var new_cookie = []
        $.each(cookie_val, function(i, val){
            if(val.name != name){
                new_cookie.push(val);
            }
        })
        $.cookie('crimearound_us', JSON.stringify(new_cookie));
        $(e.currentTarget).parent().remove();
    }

    function load_remembered_search(e){
        $('#map').spin('large');
        var name = $(e.target).text();
        var cookie_val = $.parseJSON($.cookie('crimearound_us'));
        var query = null;
        $.each(cookie_val, function(i, val){
            if(val.name == name){
                query = val;
            }
        });
        delete query['name'];
        $.when(get_results(query)).then(
            function(resp){
                reload_state(query, resp);
            }
        ).fail();
    }

    function bind_popup(marker){
        var feature = marker.feature.geometry
        var crime_template = new EJS({url: 'js/views/crimeTemplate.ejs'});
        var props = feature.properties;
        var pop_content = crime_template.render(props);
        var popup = new L.Popup({closeButton: true, minWidth: 320});
        popup.setContent(pop_content);
        popup.setLatLng(marker.getLatLng());
        map.openPopup(popup)
        //layer.bindPopup(pop_content, {
        //    closeButton: true,
        //    minWidth: 320
        //})
    }

    function get_report(e){
        e.preventDefault();
        var query = JSON.stringify(meta_data.query);
        if (typeof query !== 'undefined'){
            window.location = endpoint + '/api/report/?query=' + query;
        } else {
            $('#report-modal').reveal()
        }
    }

    function print(e){
        e.preventDefault();
        if (typeof meta_data.query !== 'undefined'){
            var query = {'query': meta_data.query}
            query['center'] = [map.getCenter().lng, map.getCenter().lat];
            query['dimensions'] = [map.getSize().x, map.getSize().y];
            query['zoom'] = map.getZoom();
            query = JSON.stringify(query);
            window.location = endpoint + '/api/print/?query=' + query;
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
    }
})()
