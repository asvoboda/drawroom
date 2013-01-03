var app = require('express').createServer();
var io = require('socket.io').listen(app);
var UUID = require('node-uuid');
var port = process.env.PORT || 4004;


app.listen(port, function () {
  var addr = app.address();
  console.log('app listening on http://' + addr.address + ':' + addr.port);
});

app.get( '/', function( req, res ){
    res.sendfile( __dirname + '/index.html' );
});

app.get( '/*' , function( req, res, next ) {
	var file = req.params[0];
	console.log('\t :: Express :: file requested : ' + file);
	res.sendfile( __dirname + '/' + file );
});

io.set('log level', 1);

// users which are currently connected to the chat
var users = {};

io.sockets.on('connection', function (socket) {

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		var d = new Date();
		var timestamp = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();		
		socket.username = username;
		socket.id = UUID();
		users[socket.id] = username;
		// echo to room 1 that a person has connected to their room
		io.sockets.emit('updatechat', 'SERVER', username + ' has connected to this room', timestamp);		
		console.log("Added user " + socket.username + " with id " + socket.id);
	});
	
	socket.on('sendchat', function (data, timestamp) {
		var d = new Date();
		var timestamp = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();		
		io.sockets.emit('updatechat', socket.username, data, timestamp);
	});	
	
	// Start listening for mouse move events
    socket.on('mousemove', function (data) {
		//send to everyone but the originating client
        io.sockets.emit('moving', data);
    });

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete users[socket.id];
		// update list of users client side
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
		io.sockets.emit('updateusers', users);
		console.log("User " + socket.username + " left");
	});
});