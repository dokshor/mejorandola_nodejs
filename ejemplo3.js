/* Requerimos el objeto HTTP */
http = require('http');

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
	req.on("end", function() {
		console.log("Cliente se desconecto desde " + res.socket.remoteAddress);
    	res.end();
	});


}).listen(4444);

console.log("Servidor iniciado en el puerto: 4444");
