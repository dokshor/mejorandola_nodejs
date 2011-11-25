/* Requerimos el objeto HTTP */
http = require('http');
puertos = Array('8888','8887','8886', '8885');


for(i=0;i<puertos.length;i++) {
	
	http.createServer(function (req, res) {
		var i = 0;
		console.log("Nueva conexion entrante desde " + res.socket.remoteAddress);
	    res.writeHead(200, {'Content-Type': 'text/html'});    
	    setInterval(function(){
	
			// Creo el objeto de fecha
			var currentTime = new Date();
	
			// Envio la respuesa
	        res.write(
	            currentTime.getHours()
	            + ':' +
	            currentTime.getMinutes()
	            + ':' +
	            currentTime.getSeconds() + "\n"
	        );
	    },1000);

		// Cuando el cliente se desconecte
		req.on("close", function() {
			console.log("Cliente se desconecto desde " + res.socket.remoteAddress);
	    	res.end();
		});


	}).listen(puertos[i]);
	console.log("Servidor iniciado en el puerto: " + puertos[i]);	
}

