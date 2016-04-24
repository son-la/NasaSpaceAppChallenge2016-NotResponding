var constrollerPosition = { lat: 63.09508899999999, lng: 21.61645640000006 };
var dronePosition = { lat: 63.09508899999999, lng: 21.61645640000006 };
var map;
var cotrollerMarker;
var droneMarker;

var weather_marker = [];
var info = [];

// Error handler
function errorHandler(err) {
    if (err.code == 1) {
        alert("Error: Access is denied!");
    }
            
    else if (err.code == 2) {
        alert("Error: Position is unavailable!");
    }
}
		

// Init map
function initMap() {
    
    // Intialize GG Map frame
    var mapDiv = document.getElementById('map');

    map = new google.maps.Map(mapDiv, {
        center: constrollerPosition,
        zoom: 12,
    });
    
    
    // Add controller 
    cotrollerMarker = new google.maps.Marker({
        position: constrollerPosition,
        map: map,
        icon: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png'
    });
    
    // Add drone 
    droneMarker = new google.maps.Marker({
        position: dronePosition,
        map: map,
        icon: '/images/drone.png'
    });
    
    // Add no fly zone
    var triangleCoords = [
        { lat: 63.099613 , lng: 21.621641 },
        { lat: 63.10006, lng: 21.61501},
        { lat: 63.101768, lng: 21.609142 },
        { lat: 63.101263, lng: 21.62605 }
    ];
    
    // Construct the polygon
    var bermudaTriangle = new google.maps.Polygon({
        paths: triangleCoords,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35
    });
    bermudaTriangle.setMap(map);
    

    /* 4 directions weather */
    for (var cnt = 0; cnt < 4; cnt++) {
        weather_marker[cnt] = new google.maps.Marker({
            map: map
        })

        info[cnt] = new google.maps.InfoWindow({
            content: generateInfo(0,0,0,0,0)
        });

        google.maps.event.addListener(weather_marker[cnt], 'click', (function (marker, cnt) {
            return function () {
                info[cnt].open(map, weather_marker[cnt]);
            }
        })(weather_marker[cnt], cnt));
    }
    
}


/* Socket IO */
var port = prompt("Please enter your nameport", 1337);
while (port == null) {
    port = prompt("Please enter your nameport", 1337);
}


var io = io();
var c = io.connect('localhost:'+port);
io.emit('register', { role: 'controller' });


/* Stream camera data */
io.on('update_stream', function (data) {
    var streamDiv = document.getElementById('stream');
    stream.setAttribute('src', data);
});

/* Controller position */
function sendControllerGPS () {
    if (navigator.geolocation) {
        var options = { timeout: 10000 };
        navigator.geolocation.getCurrentPosition(
            function (position) {
                console.log(position);
                var data = { role: 'controller', timestamp: position['timestamp'], lat: position.coords.latitude, lng: position.coords.longitude };
                
                // Send data to server
                io.emit('gpsLocation', data);
                
                // Update map
                             
            }, errorHandler, options);
    }
    else {
        console.log('No GPS data');
    }
}
var contollerPosition = setInterval(sendControllerGPS, 10000);
sendControllerGPS();

/* Drone position */
io.on('update_drone_position', function (data) {
        
    dronePosition = { lat: parseFloat(data.lat), lng: parseFloat(data.lng) };
        
    var mapDiv = document.getElementById('map');
        
    map.setCenter(dronePosition);
    droneMarker.setPosition(dronePosition);
});



/* Weather data */
io.on('update_weather_condition', function (data) {
    $('#wind').html(data[0].wind);
    $('#gust').html(data[0].gust);
    $('#dew').html(data[0].dew);
    $('#temperature').html(data[0].temperature);
    $('#visibility').html(data[0].visibility);
   
    // Show 4 weather points
    for (var cnt = 0; cnt < 4; cnt++) {
        c
        var coord = {lat:parseFloat(data[cnt+1].coord.lat), lng: parseFloat(data[cnt+1].coord.lng)}
        weather_marker[cnt].setPosition(coord);
            
        info[cnt].setContent(generateInfo(data[cnt+1].wind, data[cnt+1].gust, data[cnt+1].dew, data[cnt+1].temperature, data[cnt+1].visibility));
    }
});

// Genereate marker info
function generateInfo(w, g, d, t, v) {
    return "<p> Wind: " + w + "</p>" +
"<p>Gust Speed Potential: " + g + "</p>" +
"<p>Dew point: " + d + "</p>" + 
"<p>Temperature: " + t + "</p>" + 
"<p>Visibility: " + v + "</p>";
}

io.on('emergency', function (data) {
    switch(data.type) {
        case 'obstacle':
            switch (data.direction) {
                case 'n':
                    $('#alert').removeClass().addClass('n_alert');
                    break;
                case 'w':
                    $('#alert').removeClass().addClass('w_alert');
                    break;
                case 's':
                    $('#alert').removeClass().addClass('s_alert');
                    break;
                case 'e':
                    $('#alert').removeClass().addClass('e_alert');
                    break;
                default:
                    break;
            }
           $('#alert').html('<strong>!Obstacle</strong> ');

             $('#alert').toggle();
            window.setTimeout(function () {
                 $('#alert_north').toggle();
            }, 500);
            break;
        case 'no-fly':
            {
                console.log('terve');
                $('#alert').html('<strong>!No-fly zone</strong> ');
                $('#alert').toggle();
                window.setTimeout(function () {
                    $('#alert').toggle();
                }, 2000);
                break;
            }
        case 'weather':
            switch (data.direction) {
                case 'n':
                    $('#alert').removeClass().addClass('n_alert');
                    break;
                case 'w':
                    $('#alert').removeClass().addClass('w_alert');
                    break;
                case 's':
                    $('#alert').removeClass().addClass('s_alert');
                    break;
                case 'e':
                    $('#alert').removeClass().addClass('e_alert');
                    break;
                default:
                    $('#alert').removeClass().addClass('n_alert');
                    break;
            }
            $('#alert').html('<strong>!Weather</strong> ');
            
            $('#alert').toggle();
            window.setTimeout(function () {
                $('#alert').toggle();
            }, 500);
            break;
        default:
            break;
            
    }

});


