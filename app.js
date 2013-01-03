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

// rooms which are currently available in chat
var rooms = ['RoomA','RoomB'];

io.sockets.on('connection', function (socket) {

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		socket.username = username;
		socket.room = rooms[0];
		socket.id = UUID();
		users[socket.id] = username;
		socket.join(rooms[0]);
		io.sockets.emit('updaterooms', rooms, socket.room);
		socket.emit('updaterooms', rooms, rooms[0]);
		console.log(rooms);
		console.log("Added user " + socket.username + " with id " + socket.id + " to room " + rooms[0]);
	});

	
	socket.on('addRoom', function(newroom) {
		rooms.push(newroom);
		io.sockets.emit('newroom', newroom);
		console.log("Added Room: " + newroom);
	});	

	socket.on('switchRoom', function(newroom){
		socket.leave(socket.room);
		socket.join(newroom);
		console.log("User " + socket.username + " id " + socket.id + " trying to switch to room " + newroom + " from " + socket.room);
		socket.room = newroom;
		socket.emit('updaterooms', rooms, newroom);
		console.log("User " + socket.username + " id " + socket.id + " switched to room " + socket.room);
	});
	
	// Start listening for mouse move events
    socket.on('mousemove', function (data) {
		//send to everyone but the originating client
        io.sockets.in(socket.room).emit('moving', data);
    });

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete users[socket.id];
		// update list of users client side
		
		io.sockets.emit('updateusers', users);
		console.log("User " + socket.username + " left");
		socket.leave(socket.room);
	});
});