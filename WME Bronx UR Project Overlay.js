// ==UserScript==
// @name         WME Bronx UR Project Overlay
// @namespace    WazeDev
// @version      2018.07.18.001
// @description  Adds a group area overlay for the Bronx UR Project (2018).
// @author       MapOMatic
// @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @license      GNU GPLv3
// @grant        none
// ==/UserScript==

(function() {
    var Version = GM_info.script.version;
    var ScriptName = GM_info.script.name;
    var UpdateAlert = "yes";
    var UpdateNotes = ScriptName + " has been updated to v" + Version;
    UpdateNotes = UpdateNotes + "\n" +
        "* Added a group jump box dropdown menu.";
    if (UpdateAlert === "yes") {
        ScriptName = ScriptName.replace( /\s/g, "") + "Version";
        if (localStorage.getItem(ScriptName) !== Version) {
            alert(UpdateNotes);
            localStorage.setItem(ScriptName, Version);
        }
    }
    'use strict';

    // Enter the state abbreviation:
    var _stateAbbr = "Bronx";

    // Enter the MapRaid area names and the desired fill colors, in order they appear in the original map legend:
    var _areas = {
        '1':{fillColor:'#FF0000'},
        '2':{fillColor:'#FF0000'},
        '3':{fillColor:'#01579b'},
        '4':{fillColor:'#7cb342'},
        '5':{fillColor:'#f57c00'},
        '6':{fillColor:'#7cb342'},
        '7':{fillColor:'#f57c00'},
        '8':{fillColor:'#FF0000'},
        '9':{fillColor:'#01579b'},
        '10':{fillColor:'#FF0000'},
        '11':{fillColor:'#01579b'},
        '12':{fillColor:'#7cb342'},
        '13':{fillColor:'#f57c00'},
        '14':{fillColor:'#7cb342'},
        '15':{fillColor:'#f57c00'},
        '16':{fillColor:'#FF0000'},
        '17':{fillColor:'#01579b'},
        '18':{fillColor:'#01579b'},
        '19':{fillColor:'#7cb342'}
    };

    var _settingsStoreName = '_wme_' + _stateAbbr + '_mapraid';
    var _settings;
    var _features;
    var _kml;
    var _layerName = _stateAbbr + ' MapRaid';
    var _layer = null;
    var defaultFillOpacity = 0.3;

    function loadSettingsFromStorage() {
        _settings = $.parseJSON(localStorage.getItem(_settingsStoreName));
        if(!_settings) {
            _settings = {
                layerVisible: true,
                hiddenAreas: []
            };
        } else {
            _settings.layerVisible = (_settings.layerVisible === true);
            _settings.hiddenAreas = _settings.hiddenAreas || [];
        }
    }

    function saveSettingsToStorage() {
        if (localStorage) {
            var settings = {
                layerVisible: _layer.visibility,
                hiddenAreas: _settings.hiddenAreas
            };
            localStorage.setItem(_settingsStoreName, JSON.stringify(settings));
        }
    }

    function updateDistrictNameDisplay(){
        $('.mapraid-region').remove();
        if (_layer !== null) {
            var mapCenter = new OpenLayers.Geometry.Point(W.map.center.lon,W.map.center.lat);
            for (var i=0;i<_layer.features.length;i++){
                var feature = _layer.features[i];
                var color;
                var text = '';
                var num;
                var url;
                if(feature.geometry.containsPoint(mapCenter)) {
                    text = feature.attributes.name;
                    color = '#ff0';
                    var $div = $('<div>', {id:'mapraid', class:"mapraid-region", style:'display:inline-block;margin-left:10px;', title:'Click to toggle color on/off for this group'})
                    .css({color:color, cursor:"pointer", fontWeight:'bold', fontSize:"14px"})
                    .click(toggleAreaFill);
                    var $span = $('<span>').css({display:'inline-block'});
                    $span.text('Group: ' + text).appendTo($div);
                    $('.location-info-region').parent().append($div);
                    if (color) {
                        break;
                    }
                }
            }
        }
    }

    function toggleAreaFill() {
        var text = $('#mapraid span').text();
        if (text) {
            var match = text.match(/^Group: (.*)/);
            if (match.length > 1) {
                var areaName = match[1];
                var f = _layer.getFeaturesByAttribute('name', areaName)[0];
                var hide = f.attributes.fillOpacity !== 0;
                f.attributes.fillOpacity = hide ? 0 : defaultFillOpacity;
                var idx = _settings.hiddenAreas.indexOf(areaName);
                if (hide) {
                    if (idx === -1) _settings.hiddenAreas.push(areaName);
                } else {
                    if (idx > -1) {
                        _settings.hiddenAreas.splice(idx,1);
                    }
                }
                saveSettingsToStorage();
                _layer.redraw();
            }
        }
    }


    function init() {
        loadSettingsFromStorage();
        var layerid = 'wme_' + _stateAbbr + '_mapraid';
        var wkt = new OL.Format.WKT();
        var _features = wktStrings.map(polyString => {
            var f = wkt.read(polyString);
            f.geometry.transform(W.map.displayProjection, W.map.projection);
            return f;
        });
        var i = 0;
        for(var areaName in _areas) {
            _features[i].attributes.name = areaName;
            _features[i].attributes.fillColor = _areas[areaName].fillColor;
            _features[i].attributes.fillOpacity = _settings.hiddenAreas.indexOf(areaName) > -1 ? 0 : defaultFillOpacity;
            i++;
        }
        var layerStyle = new OpenLayers.StyleMap({
            strokeDashstyle: 'solid',
            strokeColor: '#000000',
            strokeOpacity: 1,
            strokeWidth: 3,
            fillOpacity: '${fillOpacity}',
            fillColor: '${fillColor}',
            label: 'Group ${name}',
            fontOpacity: 0.9,
            fontSize: "20px",
            fontFamily: "Arial",
            fontWeight: "bold",
            fontColor: "#fff",
            labelOutlineColor: "#000",
            labelOutlineWidth: 2
        });
        _layer = new OL.Layer.Vector(_stateAbbr + " UR Project", {
            rendererOptions: { zIndexing: true },
            uniqueName: layerid,
            shortcutKey: "S+" + 0,
            layerGroup: _stateAbbr + '_mapraid',
            zIndex: -9999,
            displayInLayerSwitcher: true,
            visibility: _settings.layerVisible,
            styleMap: layerStyle
        });
        I18n.translations[I18n.locale].layers.name[layerid] = _stateAbbr + " MapRaid";
        _layer.addFeatures(_features);
        W.map.addLayer(_layer);
        W.map.events.register("moveend", null, updateDistrictNameDisplay);
        window.addEventListener('beforeunload', function saveOnClose() { saveSettingsToStorage(); }, false);
        updateDistrictNameDisplay();

        // Add the layer checkbox to the Layers menu.
        WazeWrap.Interface.AddLayerCheckbox("display", _stateAbbr + " UR Project", _settings.layerVisible, layerToggled);
    }

    function layerToggled(visible) {
        _layer.setVisibility(visible);
        saveSettingsToStorage();
    }
    function Group1() {
        W.map.setCenter(new OL.LonLat(-8220430.1375199, 4998294.8576888))
        W.map.zoomTo(4)
    }
    function Group2() {
        W.map.setCenter(new OL.LonLat(-8226796.5059452, 4998015.9819683))
        W.map.zoomTo(5)
    }
    function Group3() {
        W.map.setCenter(new OL.LonLat(-8223180.0790449, 4996664.0020307))
        W.map.zoomTo(5)
    }
    function Group4() {
        W.map.setCenter(new OL.LonLat(-8219205.5610078, 4995170.9638542))
        W.map.zoomTo(3)
    }
    function Group5() {
        W.map.setCenter(new OL.LonLat(-8215842.3317637, 4993986.189916))
        W.map.zoomTo(4)
    }
    function Group6() {
        W.map.setCenter(new OL.LonLat(-8227656.1635063, 4995206.4160958))
        W.map.zoomTo(4)
    }
    function Group7() {
        W.map.setCenter(new OL.LonLat(-8224398.0351761, 4994059.8606717))
        W.map.zoomTo(4)
    }
    function Group8() {
        W.map.setCenter(new OL.LonLat(-8220604.847648, 4992650.5529629))
        W.map.zoomTo(4)
    }
    function Group9() {
        W.map.setCenter(new OL.LonLat(-8214986.7260698, 4990457.7657143))
        W.map.zoomTo(2)
    }
    function Group10() {
        W.map.setCenter(new OL.LonLat(-8226801.0242525, 4991723.7539952))
        W.map.zoomTo(3)
    }
    function Group11() {
        W.map.setCenter(new OL.LonLat(-8223910.7491209, 4990562.8666283))
        W.map.zoomTo(3)
    }
    function Group12() {
        W.map.setCenter(new OL.LonLat(-8220117.5615927, 4989239.5505763))
        W.map.zoomTo(3)
    }
    function Group13() {
        W.map.setCenter(new OL.LonLat(-8217291.7802037, 4987565.1019256))
        W.map.zoomTo(4)
    }
    function Group14() {
        W.map.setCenter(new OL.LonLat(-8228356.0400464, 4988334.2495227))
        W.map.zoomTo(3)
    }
    function Group15() {
        W.map.setCenter(new OL.LonLat(-8225064.4705163, 4987082.5931847))
        W.map.zoomTo(3)
    }
    function Group16() {
        W.map.setCenter(new OL.LonLat(-8221328.6107594, 4985577.7391906))
        W.map.zoomTo(3)
    }
    function Group17() {
        W.map.setCenter(new OL.LonLat(-8217463.7635172, 4984641.3855942))
        W.map.zoomTo(3)
    }
    function Group18() {
        W.map.setCenter(new OL.LonLat(-8228867.2126729, 4984488.5115376))
        W.map.zoomTo(3)
    }
    function Group19() {
        W.map.setCenter(new OL.LonLat(-8225456.2102862, 4982969.3256007))
        W.map.zoomTo(3)
    }

    function GroupNo() {
        var JumperRegion = document.getElementById('mapraidDropdown').value
        if (JumperRegion === '0') { setTimeout(GroupNo, 1000)
                                  } if (JumperRegion == '1B') {
                                      Group1();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '2B') {
                                      Group2();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '3B') {
                                      Group3();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '4B') {
                                      Group4();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '5B') {
                                      Group5();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '6B') {
                                      Group6();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '7B') {
                                      Group7();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '8B') {
                                      Group8();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '9B') {
                                      Group9();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '10B') {
                                      Group10();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '11B') {
                                      Group11();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '12B') {
                                      Group12();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '13B') {
                                      Group13();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '14B') {
                                      Group14();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '15B') {
                                      Group15();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '16B') {
                                      Group16();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '17B') {
                                      Group17();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '18B') {
                                      Group18();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  } if (JumperRegion == '19B') {
                                      Group19();
                                      document.getElementById('mapraidDropdown').value = '0'
                                  }
        setTimeout(GroupNo, 1000);
    }
    function initMapRaidOverlay() {
        if (typeof Waze === 'undefined' || typeof W.map === 'undefined' || typeof W.loginManager === 'undefined' || !document.querySelector('#topbar-container > div > div > div.location-info-region > div') || !document.getElementById('layer-switcher-group_display')) {
            setTimeout(initMapRaidOverlay, 800);
            return;
        }
        if (!W.loginManager.user) {
            W.loginManager.events.register("login", null, initMapRaidOverlay);
            W.loginManager.events.register("loginStatus", null, initMapRaidOverlay);
            if (!W.loginManager.user) {
                return;
            }
        }
        var _areaJumper = document.getElementById('mapraidDropdown');
        var _grouplist = '<optgroup label="Bronx"><option value="1B">Group 1</option><option value="2B">Group 2</option><option value="3B">Group 3</option><option value="4B">Group 4</option><option value="5B">Group 5</option><option value="6B">Group 6</option><option value="7B">Group 7</option><option value="8B">Group 8</option><option value="9B">Group 9</option><option value="10B">Group 10</option><option value="11B">Group 11</option><option value="12B">Group 12</option><option value="13B">Group 13</option><option value="14B">Group 14</option><option value="15B">Group 15</option><option value="16B">Group 16</option><option value="17B">Group 17</option><option value="18B">Group 18</option><option value="19B">Group 19</option></optgroup>'
        if (_areaJumper != null) {
            _areaJumper.innerHTML += _grouplist
        }
        if (!_areaJumper) {
            _areaJumper = document.createElement('select');
            _areaJumper.id = 'mapraidDropdown';
            _areaJumper.style.marginTop = '4px';
            _areaJumper.style.display = 'block';
            _areaJumper.innerHTML = '<option value="0">NY UR Project</option>'+_grouplist
        }

        if (!document.getElementById('mapraidDropdown')) {
            // Deal with new layout
            if (window.getComputedStyle(document.getElementById('edit-buttons').parentNode).display == 'flex') {
                var _areaJumperContainer = document.createElement('div');
                _areaJumperContainer.style.flexGrow = '1';
                _areaJumperContainer.style.paddingTop = '6px';
                _areaJumper.style.width = '80%';
                _areaJumper.style.margin = '0 auto';
                _areaJumperContainer.appendChild(_areaJumper);
                document.getElementById('edit-buttons').parentNode.insertBefore(_areaJumperContainer, document.getElementById('edit-buttons'));
            } else {
                document.getElementById('edit-buttons').parentNode.insertBefore(_areaJumper, document.getElementById('edit-buttons'));
            }
            GroupNo();
        }
    }
    function bootstrap() {
        if (W && W.loginManager && W.loginManager.isLoggedIn()) {
            init();
            initMapRaidOverlay();
            console.log(_stateAbbr + ' Area Overlay:', 'Initialized');
        } else {
            console.log(_stateAbbr + ' MR Overlay: ', 'Bootstrap failed.  Trying again...');
            window.setTimeout(() => bootstrap(), 500);
        }
    }
    setTimeout(bootstrap, 5000);

    var wktStrings = [
        'POLYGON((-73.85507583618163 40.91558813293605,-73.83242726325989 40.90838015784857,-73.83790969848631 40.89436735747279,-73.86104106903075 40.90062807267998,-73.85507583618163 40.91558813293605))',
        'POLYGON((-73.91860127449036 40.91705557713718,-73.88242363929747 40.90640978718602,-73.89030933380127 40.889947195242996,-73.92637968063354 40.89977658534929,-73.91860127449036 40.91705557713718))',
        'POLYGON((-73.88242363929747 40.90640978718602,-73.84918570518494 40.89741669174711,-73.85698556900024 40.8808950792166,-73.89030933380127 40.889947195242996,-73.88242363929747 40.90640978718602))',
        'POLYGON((-73.84918570518494 40.89741669174711,-73.81447792053223 40.88849537111659,-73.8227391242981 40.87156588656279,-73.85698556900024 40.8808950792166,-73.84918570518494 40.89741669174711))',
        'POLYGON((-73.81447792053223 40.88849537111659,-73.74794840812682 40.87185795078844,-73.75353813171385 40.857967248129,-73.8227391242981 40.87156588656279,-73.81447792053223 40.88849537111659))',
        'POLYGON((-73.92637968063354 40.89977658534929,-73.89030933380127 40.889947195242996,-73.89975070953368 40.870137998469346,-73.93526315689087 40.8798243169399,-73.92637968063354 40.89977658534929))',
        'POLYGON((-73.89030933380127 40.889947195242996,-73.85698556900024 40.8808950792166,-73.86634111404418 40.86105071641589,-73.89975070953368 40.870137998469346,-73.89030933380127 40.889947195242996))',
        'POLYGON((-73.85698556900024 40.8808950792166,-73.8227391242981 40.87156588656279,-73.83241653442381 40.85183234227608,-73.86634111404418 40.86105071641589,-73.85698556900024 40.8808950792166))',
        'POLYGON((-73.8227391242981 40.87156588656279,-73.75353813171385 40.857967248129,-73.77010345458986 40.827806609491034,-73.83241653442381 40.85183234227608,-73.8227391242981 40.87156588656279))',
        'POLYGON((-73.90893459320068 40.872604331289665,-73.88432264328003 40.86595151271601,-73.89535188674927 40.84604585892748,-73.92253875732422 40.8537799929847,-73.90893459320068 40.872604331289665))',
        'POLYGON((-73.88432264328003 40.86595151271601,-73.85320901870726 40.85748037159408,-73.86370182037354 40.837028325869056,-73.89535188674927 40.84604585892748,-73.88432264328003 40.86595151271601))',
        'POLYGON((-73.85320901870726 40.85748037159408,-73.81885528564452 40.84813164819528,-73.82959485054015 40.82730327467911,-73.86370182037354 40.837028325869056,-73.85320901870726 40.85748037159408))',
        'POLYGON((-73.81885528564452 40.84813164819528,-73.77010345458986 40.827806609491034,-73.77743124961853 40.812428818592366,-73.82959485054015 40.82730327467911,-73.81885528564452 40.84813164819528))',
        'POLYGON((-73.92253875732422 40.8537799929847,-73.89535188674927 40.84604585892748,-73.90869855880737 40.8219855525646,-73.93432974815367 40.829056811687195,-73.93472671508789 40.83459313808024,-73.92253875732422 40.8537799929847))',
        'POLYGON((-73.89535188674927 40.84604585892748,-73.86370182037354 40.837028325869056,-73.87606143951415 40.812972866741916,-73.90869855880737 40.8219855525646,-73.89535188674927 40.84604585892748))',
        'POLYGON((-73.86370182037354 40.837028325869056,-73.82959485054015 40.82730327467911,-73.84537696838377 40.798671850266516,-73.87606143951415 40.812972866741916,-73.86370182037354 40.837028325869056))',
        'POLYGON((-73.82959485054015 40.82730327467911,-73.77743124961853 40.812428818592366,-73.78169059753418 40.80367471415383,-73.84537696838377 40.798671850266516,-73.82959485054015 40.82730327467911))',
        'POLYGON((-73.93432974815367 40.829056811687195,-73.90103816986085 40.819874582820034,-73.91781806945801 40.79490321029863,-73.92811775207521 40.79964646371417,-73.9321517944336 40.806663258110945,-73.93432974815367 40.829056811687195))',
        'POLYGON((-73.90103816986085 40.819874582820034,-73.87606143951415 40.812972866741916,-73.84537696838377 40.798671850266516,-73.87867927551268 40.7801514760161,-73.91781806945801 40.79490321029863,-73.90103816986085 40.819874582820034))'
    ];
})();
