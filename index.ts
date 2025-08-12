import { serve } from "bun";

let count = 0;

interface Filament {
  domain: string;
  name: string;
}

interface MessageBlock {
  filament: Filament;
  message: string;
}

const CORS_HEADERS = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type",
  },
};

serve({
  port: 8443,

  routes: {
    "/status": new Response("OK", CORS_HEADERS),

    "/:domain/:filament": (req, server) => {
      if (
        server.upgrade(req, {
          data: {
            domain: req.params.domain,
            name: req.params.filament,
          } as Filament,
        })
      ) {
        return;
      }
      return new Response("Upgrade failed", { status: 500 });
    },
  },

  websocket: {
    message(ws, msg) {
      const block = JSON.parse(msg.toString()) as MessageBlock;
      const filament = block.filament;
      const message = block.message;

      if (!filament.domain.trim() || !filament.name.trim()) {
        ws.close(4000, "Incomplete filament information.");
        return;
      }

      const topic = `${filament.domain}/${filament.name}`;

      if (!ws.isSubscribed(topic)) {
        ws.close(4100, "Connection is not part of the filament conversation.");
        return;
      }

      count++;

      console.log(
        `${new Date().toISOString()}  ${String(count).padStart(
          6,
          "0"
        )}  ${message.slice(0, 64)}`
      );

      ws.send(message);
      ws.publish(topic, message);
    },
    open(ws) {
      const filament = ws.data as Filament;

      if (!filament.domain.trim() || !filament.name.trim()) {
        ws.close(4000, "Incomplete filament information.");
        return;
      }

      ws.subscribe(`${filament.domain}/${filament.name}`);
    },
    close(ws, code, reason) {},
  },

  fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response("Departed", CORS_HEADERS);
    }

    return new Response("Not Found", { status: 404, ...CORS_HEADERS });
  },
});
