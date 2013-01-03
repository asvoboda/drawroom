// on load of page
var drawing = false;

var users = {};
var cursors = {};

var socket = io.connect();
var id;

socket.on('connect', function() {
	socket.emit('adduser', prompt("What's your handle?"));
});

function switchRoom(room) {
	socket.emit('switchRoom', room);
}

// listener, whenever the server emits 'updaterooms', this updates the room the client is in
socket.on('updaterooms', function(rooms, current_room) {
	$('#rooms').empty();
	$.each(rooms, function(key, value) {
		if(value === current_room){
			$('#rooms').append('<div>' + value + '</div>');
		}
		else {
			$('#rooms').append('<div><a href="#" onclick="switchRoom(\''+value+'\')">' + value + '</a></div>');
		}
	});
});	

socket.on('newroom', function(newroom) {
	$('#rooms').append('<div><a href="#" onclick="switchRoom(\''+newroom+'\')">' + newroom + '</a></div>');
});	

$(function() {
	var canvas = $('#paper');
	var context = canvas[0].getContext('2d');

	if(!('getContext' in document.createElement('canvas'))) {
		alert("Your browser does not support canvas");
		return false;
	}
	
	var prev = {};
	
	$('#roomname').keypress(function(e) {
		if(e.which === 13) {
			$(this).blur();
			$('#addnewroom').focus().click();
			$('#roomname').focus();
		}
	});		
	$('#addnewroom').click( function() {
		var message = $('#roomname').val();
		$('#roomname').val('');
		if(message !== ""){
			socket.emit('addRoom', message);
		}
		$('#roomname').focus();
	});		

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
