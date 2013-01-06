// on load of page
var drawing = false;

var users = {};
var cursors = {};

var socket = io.connect();
var id;
var myname;
var tool = "pencil";
var currentColor;
var width = 1;

var brush = new Image();
brush.src = "brush2.png";

var touchSupported = Modernizr.touch;

var mouseDownEvent,
	mouseMoveEvent,
	mouseUpEvent;

if (touchSupported) {
	mouseDownEvent = "touchstart";
	mouseMoveEvent = "touchmove";
	mouseUpEvent = "touchend";
} else {
	mouseDownEvent = "mousedown";
	mouseMoveEvent = "mousemove";
	mouseUpEvent = "mouseup";
}

function ID () {
    var S4 = function () {
        return Math.floor(
                Math.random() * 0x10000 /* 65536 */
            ).toString(16);
    };
    return ( S4() + S4() + S4() );
}

var Trig = {
	distanceBetween2Points: function ( point1, point2 ) {

		var dx = point2.x - point1.x;
		var dy = point2.y - point1.y;
		return Math.sqrt( Math.pow( dx, 2 ) + Math.pow( dy, 2 ) );	
	},

	angleBetween2Points: function ( point1, point2 ) {

		var dx = point2.x - point1.x;
		var dy = point2.y - point1.y;	
		return Math.atan2( dx, dy );
	}
}

socket.on('connect', function() {
	id = ID();
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

CanvasRenderingContext2D.prototype.clear = 
  CanvasRenderingContext2D.prototype.clear || function (preserveTransform) {
    if (preserveTransform) {
      this.save();
      this.setTransform(1, 0, 0, 1, 0, 0);
    }

    this.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (preserveTransform) {
      this.restore();
    }           
};

$(function() {
	var canvas = $('#paper');
	var context = canvas[0].getContext('2d');
	
	if(!('getContext' in document.createElement('canvas'))) {
		alert("Your browser does not support canvas");
		return false;
	}
	
	$('#data').focus();

	// when the client clicks SEND
	$('#datasend').click( function() {
		var message = $('#data').val();
		$('#data').val('');
		// tell server to execute 'sendchat' and send along one parameter
		socket.emit('sendchat', message);
		$('#data').focus();
	});
	
	$('#pencil').click( function() {
		tool = "pencil";
	});		
	$('#crayon').click( function() {
		tool = "crayon";
	});	
	$('#brush').click( function() {
		tool = "brush";
	});	
	$('#clear').click( function() {
		//context.clear();
		socket.emit('clear');
	});		
	$('#eraser').click( function() {
		tool = "eraser";
	});	
	$('#save').click( function() {
		window.open(save(), '_blank', 'width=800,height=600')
	});		

	$('#width').bind('keyup', function() { 
		width = $(this).val() // get the current value of the input field.
	});	

	// when the client hits ENTER on their keyboard
	$('#data').keypress(function(e) {
		if(e.which == 13) {
			$(this).blur();
			$('#datasend').focus().click();
			$('#data').focus();
		}
	});	
	
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
				drawLine(users[data.id].x, users[data.id].y, data.x, data.y, data.color, data.tool, data.width);
			}
			
			users[data.id] = data;
			users[data.id].updated = $.now();
		}
	});
	
	socket.on('clearcanvas', function() {
		context.clear();
	});
	
	canvas.on(mouseDownEvent, function(e) {
		e.preventDefault();
		drawing = true;
		
		var target;
		if (touchSupported) {
			target = event.originalEvent.touches[0]
		}
		else {
			target = event;
		}		
		
		prev.x = target.pageX;
		prev.y = target.pageY;
	});
	
	$(document).bind(mouseUpEvent + ' mouseleave', function(){
		drawing = false;
	});
	
	var lastEmit = $.now();
	
	$(document).on(mouseMoveEvent, function(e){
		var target;
		if (touchSupported) {
			target = e.originalEvent.touches[0]
		}
		else {
			target = e;
		}
		
		if($.now() - lastEmit > 30){		
			socket.emit('mousemove', {
				'x': target.pageX,
				'y': target.pageY,
				'drawing': drawing,
				'id': id,
				'username': myname,
				'color': $.minicolors.rgbString($('#color-selector')),
				'tool': tool,
				'width': width
			});
			lastEmit = $.now();
		}
		
		if(drawing){
			//drawLine(prev.x, prev.y, e.pageX, e.pageY);
			
			var target;
			if (touchSupported) {
				target = event.originalEvent.touches[0]
			}
			else {
				target = event;
			}		
			
			prev.x = target.pageX;
			prev.y = target.pageY;
		}
	});
	
	function save(){
		var dataString = canvas.get(0).toDataURL("image/png");
		//var index = dataString.indexOf( "," )+1;
		//dataString = dataString.substring( index );

		return dataString;		
	}
	
	function drawLine(from_x, from_y, to_x, to_y, color, tool, width) {

		
		if(tool === "brush"){
			var halfBrushW = brush.width/2;
			var halfBrushH = brush.height/2;

			var start = { x:from_x, y: from_y };
			var end = { x: to_x, y: to_y };

			var distance = parseInt( Trig.distanceBetween2Points( start, end ) );
			var angle = Trig.angleBetween2Points( start, end );

			var x,y;
			context.globalCompositeOperation = "source-over";
			for ( var z=0; (z<=distance || z==0); z++ )
			{
				x = start.x + (Math.sin(angle) * z) - halfBrushW;
				y = start.y + (Math.cos(angle) * z) - halfBrushH;
				context.drawImage(brush, x, y);
			}
		}else if(tool === "pencil"){
			context.beginPath();
			context.moveTo(from_x, from_y);
			context.lineTo(to_x, to_y);
			context.lineJoin = 'round';
			context.lineCap = 'round';
			context.lineWidth = width;			
			context.strokeStyle = color;
			context.globalCompositeOperation = "source-over";
			context.stroke();	
			
		}else if(tool === "eraser"){
			context.beginPath();
			context.moveTo(from_x, from_y);
			context.lineTo(to_x, to_y);
			context.lineJoin = 'round';
			context.lineCap = 'round';
			context.lineWidth = width;
			context.fillStyle = "rgba(0,0,0,1)";
			context.globalCompositeOperation = "destination-out";				
			context.stroke();		
		}
	}	
});
