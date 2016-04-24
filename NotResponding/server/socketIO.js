var http = require('../app');
var io = require('socket.io').listen(http);
var request = require('request');

var streamURL = 'http://192.168.148.49:8080/video';

var noflyzone = [
    { lat: 63.098137, lng: 21.622617 },
    { lat: 63.097914, lng: 21.610526 },
    { lat: 63.101768, lng: 21.609142 },
    { lat: 63.101263, lng: 21.62605 }
];


var controller_id;
var drone_id;
var controller_position;
var drone_position;

// Connection and register
io.on('connection', function (socket) {
    
    // Check socket register information
    socket.on('register', function (data) {
        if (data.role == 'controller') {
            
            // Save controller id
            controller_id = socket.id;
            console.log("Controller connected", socket.id);
            
            // Stream camera if source available
            socket.emit('update_stream', streamURL);     
            
        }
        else if (data.role == 'drone') {
            
            // Save drone id
            drone_id = socket.id
            console.log("Drone connected", socket.id);
        }
    });
    
    
    
    // Controller and Drones will send gps data through this.
    socket.on('gpsLocation', function (data) {
        
        
        if (data.role == 'controller') { // GPS of controller
            controller_position = { lat: data.lat, lng: data.lng };        
        }
        else if (data.role == 'drone') { // GPS of drone
            drone_position = { lat: data.lat, lng: data.lng };
            

            io.emit('update_drone_position', drone_position); // Update drone position
            
            
            // Calculate points around drone in range 8km

            // Bearing:
            // East: 90
            // West: -90
            // South: 180
            // North: 0
            
            var bearing = [Math.PI / 2, -Math.PI / 2, Math.PI, 0]; // East - West - South - North
            var d = 5000;// Shift distance in m
            var R = 6371000; // Earth radius in m
            
            // Drone position
            var lat = [data.lat]; 
            var lng = [data.lng];
            
            // Weather data
            var weather_data = [];
            
            // Check if in no fly zone - FAKE DATA
            if (lat > 63.1) {
                if (controller_id == null) {
                    return;
                }

                var emergency_data = { type: 'no-fly' };
                io.sockets.connected[controller_id].emit('emergency', emergency_data);
            }
            

            
            // Get locations of surrounding points
            // http://www.movable-type.co.uk/scripts/latlong.html
            bearing.forEach(function (bearing_value) {
                var lat_radian = data.lat / 180 * Math.PI;
                var lng_radian = data.lng / 180 * Math.PI;

                lat[lat.length] = Math.asin(Math.sin(lat_radian) * Math.cos(d / R) + 
                              Math.cos(lat_radian) * Math.sin(d / R) * Math.cos(bearing_value)) * 180 / Math.PI;
                       
                lng[lng.length] = (lng_radian + Math.atan2(Math.sin(bearing_value) * Math.sin(d / R) * Math.cos(lat_radian) ,
                                                            Math.cos(d / R) - Math.sin(lat_radian) * Math.sin(lat[lat.length - 1]/189 * Math.PI))) * 180 / Math.PI;
            });
            
            
            
            for (var cnt = 0; cnt < lat.length; cnt++) {
                
                var url = 'http://api.wunderground.com/api/f3a658c8c66e1f5f/conditions/q/' + lat[cnt] + ',' + lng[cnt] + '.json';
               
                request(url, function (error, response, body) {                    
                    if (!error && response.statusCode == 200 && body != null) {
                        // Get weather successfully
                        body = JSON.parse(body);

                        var temp = body.current_observation.temp_c.toString() + "°C";
                        var visibility = body.current_observation.visibility_km.toString() + ' km';
                        var dew_point = body.current_observation.dewpoint_c.toString() + '°C';
                        var wind = body.current_observation.wind_kph.toString() + 'km/h ' + body.current_observation.wind_dir;
                        var gust = body.current_observation.wind_gust_kph.toString() + 'km/h';

                        var coord = { "lat": lat[weather_data.length], "lng": lng[weather_data.length] };
                        
                                

                        weather_data.push({ coord: coord, temperature: temp, wind:wind, visibility:visibility, dew:dew_point, gust:gust});
                        
                        // Update the weather condition on the map                                     
                        if (weather_data.length == lat.length) {
                            if (io.sockets.connected[controller_id] == null)
                                return;
                            io.sockets.connected[controller_id].emit('update_weather_condition', weather_data);
                        }
                        
                    }
                });
            }


        }
    });

    
});

