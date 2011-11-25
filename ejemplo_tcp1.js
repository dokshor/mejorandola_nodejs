/* Requerimos la libreria para hacer sockets */
var net = require('net');

net.createServer(function (stream) {
    stream.write('Hola maestrosdelweb\r\n');

    stream.on('end', function () {
        stream.end('au revoir\r\n');
    });

    stream.pipe(stream);
}).listen(7000);

console.log("Iniciando el servidor en el puerto 7000");
