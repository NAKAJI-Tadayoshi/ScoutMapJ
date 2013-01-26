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

var map, geocoder, db, c_x0401;
var markersArray = [];
var d_zoom = 13;
var icon_path = 'http://maps.google.com/mapfiles/ms/micons/';
var icon_style = 'width=\"16\" height=\"16\" class=\"anchor\"';
var icons = {
  "A":"rangerstation.png",
  "C":"rangerstation.png",
  "F":"campfire.png",
  "G":"campground.png"
};

function initialize() {
  geocoder = new google.maps.Geocoder();
  var lo_ll = new google.maps.LatLng(35.706979,139.754428);
  var x0401 = '13';
  var ll = $.getUrlVar('center');
  if (ll) {
    ll = ll.split(',');
    if (ll[1]) {
      lo_ll = new google.maps.LatLng(parseFloat(ll[0]), parseFloat(ll[1]));
      x0401 = null;
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
  initializeMarkers('./databases/scoutareaj.xml', x0401);
}

function initializeMarkers(file, x0401) {
  $.get(file, {}, function(data) {
    db = data;
    $(data).find('marker').each(function() {
      var lo_m = $(this);
      var lo_type = lo_m.attr('type');
      if (lo_type.match(/[^AC]/)) return;

      createMarker(lo_m, lo_type, true);
    });
    reloadMarkers(x0401);
  });
}

function createMarkers(data, x0401) {
  var group = new RegExp(prefgroup[x0401]);
  $(data).find('marker').each(function() {
    var lo_m = $(this);
    if (!(lo_m.attr('x0401').match(group))) return;
    var lo_type = lo_m.attr('type');
    if (lo_type.match(/[AC]/)) return;

    createMarker(lo_m, lo_type, false);
  });
}

function createMarker(lo_m, lo_type, init) {
  var ll = lo_m.attr('ll');
  if (!ll) return false;
  ll = ll.split(',');
  var lo_ll = new google.maps.LatLng(parseFloat(ll[0]), parseFloat(ll[1]));
  var lo_name = lo_m.attr('name');
  var lo_post = lo_m.attr('post');
  var lo_icon = icon_path + icons[lo_type];
  var marker = new google.maps.Marker({
      position: lo_ll,
      map: map,
      title: lo_name,
      icon: lo_icon
  });
  var iw = new google.maps.InfoWindow({
      content: '<span class=\"title\">' + name2a(lo_name, lo_m.attr('url')) + '</span>' + name2gs(lo_name, lo_type) +
          '<br />' + ((!lo_post)? '': '〒' + lo_post + ' ') + lo_m.attr('addr') +
          '<br />TEL: ' + lo_m.attr('tel') +
          '<br />FAX: ' + lo_m.attr('fax') +
          '<hr />' + lo_m.text()
  });
  google.maps.event.addListener(marker, 'click', function() {
      iw.open(map, marker);
  });

  if (init) {
    var name = (lo_name.split(' '))[1];
    var ll = lo_ll.toUrlValue() + ',' + lo_m.attr('x0401');
    $('<option>').attr({ value: ll }).text(name).appendTo('#pref');
  } else {
    markersArray.push(marker);
  }
}

function name2a(name, url) {
  if (!url) return name;
  return '<a href=\"' + url + '\">' + name + '</a>';
}

function name2gs(name, type) {
  var func = ((type == 'F')? 'gs': 'gsb') + '(\'' + name + '\')';
  return '<img src=\"http://www.google.com/images/icons/product/search-32.png\" title=\"Google 検索\" ' + icon_style + ' onclick=\"' + func + '\">';
}

function gs(q) {
  window.open('http://www.google.com/search?q=' + q);
}

function gsb(q) {
  gs('ボーイスカウト+' + q);
}

function reloadMarkers(x0401) {
  if (x0401) {
    if (x0401 != c_x0401) {
      c_x0401 = x0401;
      deleteOverlays();
      createMarkers(db, x0401);
    }
  } else {
    geocoder.geocode( { 'location': map.getCenter() }, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        x0401 = jisx0401[getPref(results[0].address_components)];
        if (x0401 != c_x0401) {
          c_x0401 = x0401;
          deleteOverlays();
          createMarkers(db, x0401);
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

function toggleDesc() {
  $('#description').toggle();
  $('#roll').toggle();
  $('#hang').toggle();
}

google.maps.event.addDomListener(window, 'load', initialize);
