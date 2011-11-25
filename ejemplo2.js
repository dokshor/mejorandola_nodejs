/* Requerimos el objeto HTTP */
http = require('http');

/* ¿Cuantas veces quiero que aparezcan los minutos? */
veces = 10;

http.createServer(function (req, res) {
	var i = 0;
	console.log("Nueva conexion entrante desde " + res.socket.remoteAddress);
    res.writeHead(200, {'Content-Type': 'text/html'});    
    setInterval(function(){
	
		// Creo el objeto de fecha
		var currentTime = new Date();
	
		// Envio la respuesa
        res.write(
			"A las: " + 
            currentTime.getHours()
            + ':' +
            currentTime.getMinutes()
            + ':' +
            currentTime.getSeconds() + " quedan " + (veces-i) + "\n"
        );

		i++;

		setTimeout(function() {
		            res.end();
		        }, ((veces*1) * 1000));

    },1000);
}).listen(4444);

console.log("Servidor iniciado en el puerto: 4444");
