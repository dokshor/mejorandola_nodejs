/* Iniciamos el módulo http */
var http = require("http");

/* Iniciamos las variables */
var cantidadDeConexiones = 0;

/* Creamos el objeto del servidor */
http.createServer(function(request, response) {
    console.log("Nueva conexion numero " + cantidadDeConexiones++ + " entrante desde " + request.socket.remoteAddress);
    /* Preparamos las cabeceras de respuesta */
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write("Hola niños");
    response.end();
}).listen(4444);

console.log("Servidor iniciado en el puerto: 4444");
