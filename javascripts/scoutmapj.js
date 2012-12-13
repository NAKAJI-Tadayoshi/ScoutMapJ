$.extend({
  getUrlVars: function() {
    var vars = [], hash;
    var href = window.location.href;
    var hashes = href.slice(href.indexOf('?') + 1).split('&');
    for (var i = 0, len = hashes.length; i < len; i++) {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name) {
    return $.getUrlVars()[name];
  }
});

var map, geocoder, group;
var markersArray = [];
const d_zoom = 13;

function initialize() {
  geocoder = new google.maps.Geocoder();
  var lo_ll = new google.maps.LatLng(35.706979,139.754428);
  var ll = $.getUrlVar('center');
  if (ll) {
    ll = ll.split(',');
    if (ll[1]) {
      lo_ll = new google.maps.LatLng(parseFloat(ll[0]), parseFloat(ll[1]));
    } else {
      $('#addr').val(decodeURI(ll));
      codeAddress(false);
    }
  }
  var mapOptions = {
    zoom: d_zoom,
    center: lo_ll,
    mapTypeControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    scaleControl: true,
    streetViewControl: false
  };
  map = new google.maps.Map($('#map_canvas').get(0), mapOptions);

  $.ajaxSetup({ cache: false });
  createMarkers('./databases/scoutareaj.xml');
  reloadMarkers();
}

function createMarkers(file) {
  $.get(file, {}, function(data) {
    $(data).find('marker').each(function() {
      var lo_m = $(this);
      var ll = lo_m.attr('ll');
      ll = ll.split(',');
      var lo_ll = new google.maps.LatLng(parseFloat(ll[0]), parseFloat(ll[1]));
      var lo_name = lo_m.attr('name');
      var lo_url = lo_m.attr('url');
      var lo_post = lo_m.attr('post');
      var lo_type = lo_m.attr('type');
      var lo_icon = 'http://maps.google.com/mapfiles/ms/icons/campground.png';
      if (lo_type == 'A' || lo_type == 'C' || lo_type == 'D') {
        lo_icon = 'http://maps.google.com/mapfiles/ms/icons/rangerstation.png';
      } else if (lo_type == 'F') {
        lo_icon = 'http://maps.google.com/mapfiles/ms/icons/campfire.png';
      }
      var marker = new google.maps.Marker({
          position: lo_ll,
          map: map,
          title: lo_name,
          icon: lo_icon
      });
      var iw = new google.maps.InfoWindow({
          content: ((lo_url == '')? '': '<a href=\"' + lo_url + '\">') +
              '<b>' + lo_name + '</b>' + ((lo_url == '')? '': '</a>') +
              '<br />' + ((lo_post == '')? '': '〒' + lo_post + ' ') + lo_m.attr('addr') +
              '<br />TEL: ' + lo_m.attr('tel') +
              '<br />FAX: ' + lo_m.attr('fax') +
              '<hr />' + lo_m.text()
      });
      google.maps.event.addListener(marker, 'click', function() {
          iw.open(map, marker);
      });
      if (lo_type == 'A' || lo_type == 'C') {
        var name = (lo_name.split(' '))[1];
        var ll = lo_ll.toUrlValue() + ',' + lo_m.attr('x0401');
        $('<option>').attr({ value: ll }).text(name).appendTo('#pref');
      } else {
        markersArray.push(marker);
      }
    });
  });
}

function reloadMarkers(pref) {
  if (pref) {
    var gr = prefgroup[pref];
    if (gr != group) {
      group = gr;
      deleteOverlays();
      createMarkers('./databases/scoutareaj' + group + '.xml');
    }
  } else {
    geocoder.geocode( { 'location': map.getCenter() }, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        var gr = prefgroup[jisx0401[getPref(results[0].address_components)]];
        if (gr != group) {
          group = gr;
          deleteOverlays();
          createMarkers('./databases/scoutareaj' + group + '.xml');
        }
      }
    });
  }
}

// Deletes all markers in the array by removing references to them
function deleteOverlays() {
  if (markersArray) {
    for (i in markersArray) {
      markersArray[i].setMap(null);
    }
    markersArray.length = 0;
  }
}

function codeAddress(info) {
  var addr = $('#addr').val();
  geocoder.geocode( { 'address': addr }, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      var ll = results[0].geometry.location;
      map.setZoom(d_zoom);
      map.setCenter(ll);
      reloadMarkers(jisx0401[getPref(results[0].address_components)]);
      if (info) {
        var marker = new google.maps.Marker({
            position: ll,
            map: map
        });
        var iw = new google.maps.InfoWindow({
            content: '<b>' + results[0].formatted_address.replace(/^日本, /, '') + '</b>' +
                '<br />緯度,経度: ' + ll.toUrlValue()
        });
        google.maps.event.addListener(marker, 'click', function() {
          iw.open(map, marker);
        });
        iw.open(map, marker);
      }
    } else {
      alert('緯度,経度に変換できませんでした: ' + status);
    }
  });
}

function getPref(addr) {
  for (var i = 0, len = addr.length; i < len; i++) {
    if (addr[i].types[0] == 'administrative_area_level_1') {
      return addr[i].long_name;
    }
  }
}

function enter2codeAddress(e) {
  if (!e) var e = window.event;
  if (e.keyCode == 13) codeAddress(true);
}

function selectPref() {
  var ll = $('#pref').val().split(',');
  map.setZoom(d_zoom);
  map.setCenter(new google.maps.LatLng(parseFloat(ll[0]), parseFloat(ll[1])));
  reloadMarkers(ll[2]);
}

google.maps.event.addDomListener(window, 'load', initialize);
