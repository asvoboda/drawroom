// on load of page
var drawing = false;

var users = {};
var cursors = {};

var socket = io.connect();
var id;
var myname;

function GUID ()
{
    var S4 = function ()
    {
        return Math.floor(
                Math.random() * 0x10000 /* 65536 */
            ).toString(16);
    };

    return (
            S4() + S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + S4() + S4()
        );
}


socket.on('connect', function() {
	id = GUID();
	myname = prompt("What's your handle?");
	socket.emit('adduser', myname, id);
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
	
	$('#color-selector').val('#ff0000');
	$('#color-selector').css('backgroundColor', '#ff0000');
	$('#color-selector').ColorPicker({
		color: '#ff0000',
		onShow: function (colpkr) {
			$(colpkr).fadeIn(500);
			return false;
		},
		onHide: function (colpkr) {
			$(colpkr).fadeOut(500);
			return false;
		},
		onChange: function (hsb, hex, rgb) {
			$('#color-selector').css('backgroundColor', '#' + hex);
			$('#color-selector').val('#' + hex);
		}
	});
	
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
		if(data.id !== undefined){
			if(!cursors[data.id]){
				cursors[data.id] = $('<div class="cursor">' + data.username + '</div>').appendTo('#cursors');
			}
			
			cursors[data.id].css({
				'left': data.x,
				'top': data.y,
				'background-color': data.color
			});
			
			if(data.drawing && users[data.id]) {
				console.log(data.username + " " + data.id);
				drawLine(users[data.id].x, users[data.id].y, data.x, data.y, data.color);
			}
			
			users[data.id] = data;
			users[data.id].updated = $.now();
		}
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
				'id': id,
				'username': myname,
				'color': $('#color-selector').val()
			});
			lastEmit = $.now();
		}
		
		if(drawing){
			//drawLine(prev.x, prev.y, e.pageX, e.pageY);
			
			prev.x = e.pageX;
			prev.y = e.pageY;
		}
	});
	
	function drawLine(from_x, from_y, to_x, to_y, color) {
		context.beginPath();
		context.moveTo(from_x, from_y);
		context.lineTo(to_x, to_y);
		context.strokeStyle = color;
		context.stroke();
		
	}	
});
