const PLAYERS_KEY = "nonstop-classico-dota2:players";
const NAMES_KEY = "nonstop-classico-dota2:names";

function getEnv(name) {
  return process.env[name] || "";
}

function getRedisConfig() {
  return {
    url: getEnv("KV_REST_API_URL") || getEnv("UPSTASH_REDIS_REST_URL"),
    token: getEnv("KV_REST_API_TOKEN") || getEnv("UPSTASH_REDIS_REST_TOKEN"),
  };
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizedKey(value) {
  return normalizeName(value).toLocaleLowerCase("pt-BR");
}

function jsonResponse(res, statusCode, body) {
  res.status(statusCode).setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(body));
}

async function redisCommand(command, ...args) {
  const config = getRedisConfig();
  if (!config.url || !config.token) {
    const error = new Error("Configure KV_REST_API_URL/KV_REST_API_TOKEN ou UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${config.url}/${command}/${args.map(encodeURIComponent).join("/")}`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const error = new Error(data.error || `Falha no comando Redis ${command}.`);
    error.statusCode = response.status || 500;
    throw error;
  }

  return data.result;
}

async function redisPipeline(commands) {
  const config = getRedisConfig();
  if (!config.url || !config.token) {
    const error = new Error("Configure KV_REST_API_URL/KV_REST_API_TOKEN ou UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      commands.map(([command, ...args]) => ({
        command,
        args,
      }))
    ),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error("Falha ao executar pipeline Redis.");
    error.statusCode = response.status || 500;
    throw error;
  }

  return data;
}

async function listPlayers() {
  const entries = (await redisCommand("lrange", PLAYERS_KEY, 0, -1)) || [];
  return entries
    .map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function confirmPlayer(name) {
  const displayName = normalizeName(name);
  const normalized = normalizedKey(displayName);

  if (!displayName) {
    const error = new Error("Digite um nick antes de confirmar.");
    error.statusCode = 400;
    throw error;
  }

  const player = {
    name: displayName,
    ts: Date.now(),
  };

  const script = `
    local playersKey = KEYS[1]
    local namesKey = KEYS[2]
    local normalized = ARGV[1]
    local payload = ARGV[2]
    local displayName = ARGV[3]
    local timestamp = tonumber(ARGV[4])

    if redis.call("SISMEMBER", namesKey, normalized) == 1 then
      return {0}
    end

    redis.call("RPUSH", playersKey, payload)
    redis.call("SADD", namesKey, normalized)
    local length = redis.call("LLEN", playersKey)
    return {1, length, displayName, timestamp}
  `;

  const result = await redisCommand(
    "eval",
    script,
    2,
    PLAYERS_KEY,
    NAMES_KEY,
    normalized,
    JSON.stringify(player),
    player.name,
    String(player.ts)
  );

  if (!Array.isArray(result) || result[0] !== 1) {
    const error = new Error("Esse nick ja esta confirmado. Escolha outro.");
    error.statusCode = 409;
    throw error;
  }

  const players = await listPlayers();
  const slotIndex = players.findIndex((entry) => normalizedKey(entry.name) === normalized);

  return {
    players,
    player,
    slotIndex,
  };
}

async function removePlayer(name) {
  const normalized = normalizedKey(name);
  if (!normalized) {
    const error = new Error("Informe um nick valido para remover.");
    error.statusCode = 400;
    throw error;
  }

  const currentPlayers = await listPlayers();
  const filteredPlayers = currentPlayers.filter((player) => normalizedKey(player.name) !== normalized);

  if (filteredPlayers.length === currentPlayers.length) {
    const error = new Error("Nick nao encontrado na lista.");
    error.statusCode = 404;
    throw error;
  }

  const pipeline = [["del", PLAYERS_KEY], ["del", NAMES_KEY]];

  filteredPlayers.forEach((player) => {
    pipeline.push(["rpush", PLAYERS_KEY, JSON.stringify(player)]);
  });

  filteredPlayers.forEach((player) => {
    pipeline.push(["sadd", NAMES_KEY, normalizedKey(player.name)]);
  });

  await redisPipeline(pipeline);

  return {
    players: filteredPlayers,
  };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const players = await listPlayers();
      return jsonResponse(res, 200, { players });
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        error: error.message || "Falha ao buscar os jogadores.",
      });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return jsonResponse(res, 405, { error: "Metodo nao permitido." });
  }

  const action = req.body?.action;
  const name = req.body?.name;

  try {
    if (action === "confirm") {
      const result = await confirmPlayer(name);
      return jsonResponse(res, 200, result);
    }

    if (action === "remove") {
      const result = await removePlayer(name);
      return jsonResponse(res, 200, result);
    }

    return jsonResponse(res, 400, { error: "Acao invalida." });
  } catch (error) {
    return jsonResponse(res, error.statusCode || 500, {
      error: error.message || "Falha ao processar a requisicao.",
    });
  }
}
