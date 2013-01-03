// on load of page
var drawing = false;

var users = {};
var cursors = {};

var socket = io.connect();
var id;

socket.on('connect', function() {
	socket.emit('adduser', prompt("What's your handle?"));
});

// listener, whenever the server emits 'updatechat', this updates the chat body
socket.on('updatechat', function (username, data, timestamp) {
	if(timestamp === undefined){
		timestamp = "";
	}else{
		timestamp = timestamp + "  ";
	}
	$('#conversation').append(timestamp + '<b>'+username + ':</b> ' + data + '<br>');
	$('#conversation').scrollTop(10000);
});

$(function() {
	var canvas = $('#paper');
	var context = canvas[0].getContext('2d');
	
	$('#data').focus();

	// when the client clicks SEND
	$('#datasend').click( function() {
		var message = $('#data').val();
		$('#data').val('');
		// tell server to execute 'sendchat' and send along one parameter
		socket.emit('sendchat', message);
		$('#data').focus();
	});

	// when the client hits ENTER on their keyboard
	$('#data').keypress(function(e) {
		if(e.which == 13) {
			$(this).blur();
			$('#datasend').focus().click();
			$('#data').focus();
		}
	});	

	if(!('getContext' in document.createElement('canvas'))) {
		alert("Your browser does not support canvas");
		return false;
	}
	
	var prev = {};

	socket.on('moving', function (data) {
		id = data.id;
		if(!cursors[data.id]){
			cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
		}
		
		cursors[data.id].css({
			'left': data.x,
			'top': data.y
		});
		
		if(data.drawing && users[data.id]) {
			drawLine(users[data.id].x, users[data.id].y, data.x, data.y);
		}
		
		users[data.id] = data;
		users[data.id].updated = $.now();
	});
	
	canvas.on('mousedown', function(e) {
		e.preventDefault();
		drawing = true;
		prev.x = e.pageX;
		prev.y = e.pageY;
	});
	
	$(document).bind('mouseup mouseleave', function(){
		drawing = false;
	});
	
	var lastEmit = $.now();
	
	$(document).on('mousemove', function(e){
		if($.now() - lastEmit > 30){
			socket.emit('mousemove', {
				'x': e.pageX,
				'y': e.pageY,
				'drawing': drawing,
				'id': id
			});
			lastEmit = $.now();
		}
		
		if(drawing){
			drawLine(prev.x, prev.y, e.pageX, e.pageY);
			
			prev.x = e.pageX;
			prev.y = e.pageY;
		}
	});
	
	function drawLine(from_x, from_y, to_x, to_y) {
		context.moveTo(from_x, from_y);
		context.lineTo(to_x, to_y);
		context.stroke();
	}	
});
