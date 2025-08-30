let count = 0;

interface Filament {
  domain: string;
  name: string;
  reconnectID?: string;
}

interface MessageBlock {
  filament: Filament;
  message: string;
}

const colors = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",

  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",
  FgGray: "\x1b[90m",

  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
  BgGray: "\x1b[100m"
}

const ALLOWED_ORIGINS = [
  "app.filaments.chat",
];

function getHeaders(origin?: string) {
  const allowedOrigin = (origin && ALLOWED_ORIGINS.includes(origin)) ? "" : ALLOWED_ORIGINS[0];
  console.log(allowedOrigin)
  return {
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "OPTIONS, POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  };
}

const messageQueues: Map<string, string[]> = new Map(); // Key: Hashed value, Value: Message queue

const port = Bun.env.PORT || 2428;

Bun.serve({
  port: port,

  routes: {
    "/status": (req) => new Response("OK", getHeaders(req.headers.get("origin")?.toString())),

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
    message(ws, data) {
      const msg = data.toString();

      if (msg == "ping") {
        ws.send("pong");
        return;
      }

      const block = JSON.parse(msg) as MessageBlock;
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
        `${colors.FgGray}${new Date().toISOString()}${colors.Reset}  
        ${String(count).padStart(
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

      console.log(`data: ${(ws.data as Filament)} ws: ${ws}`);

      if((ws.data as Filament).reconnectID == undefined){
        (ws.data as Filament).reconnectID = crypto.randomUUID();
      }

      ws.subscribe(`${filament.domain}/${filament.name}`);
      ws.send("." + (ws.data as Filament).reconnectID);
    },

    close(ws, code, reason) {
      console.log(`${colors.BgBlue}code:${code} \nreason:${reason} \nws:${ws}${colors.Reset}}`);
      if (code == 1006 && reason == "") {

      }
    },
    idleTimeout: -1
  },

  fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response("Departed", getHeaders(req.headers.get("origin")?.toString()));
    }

    return new Response("Not Found", { status: 404, ...getHeaders(req.headers.get("origin")?.toString()) });
  },
});

console.log(`filaments server running on port ${port}.`);
