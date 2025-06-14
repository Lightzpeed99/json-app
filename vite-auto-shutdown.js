// En la raíz del proyecto: vite-auto-shutdown.js
export default function autoShutdown() {
  let clients = new Set();

  return {
    name: "auto-shutdown",
    configureServer(server) {
      // Rastrear conexiones WebSocket
      server.ws.on("connection", (socket) => {
        clients.add(socket);

        socket.on("close", () => {
          clients.delete(socket);

          // Si no hay clientes conectados, cerrar servidor
          setTimeout(() => {
            if (clients.size === 0) {
              console.log(
                "\n🔴 No hay navegadores conectados. Cerrando servidor..."
              );
              process.exit(0);
            }
          }, 1000); // Espera 1 segundos antes de cerrar
        });
      });
    },
  };
}
