

let hooks = null;

const COMMANDS = {
  help() {
    return [
      "BlockClicker dev commands:",
      '  run("command", "gold", 999)  — добавить монеты',
      '  run("gold", 999)             — то же (префикс command необязателен)',
      '  run("command gold 999")      — одной строкой',
    ].join("\n");
  },

  gold(amount) {
    const n = Math.floor(Number(amount));
    if (!Number.isFinite(n) || n <= 0) {
      return 'Usage: run("command", "gold", <amount>)';
    }
    if (!hooks) return "Game not ready.";
    const total = hooks.addCoins(n);
    return `+${n} монет. Всего: ${total}`;
  },
};

export function initDevConsole(callbacks) {
  hooks = callbacks;

  function run(...args) {
    let tokens = args.map(String);
    if (tokens.length === 1 && tokens[0].includes(" ")) {
      tokens = tokens[0].trim().split(/\s+/);
    }
    if (tokens[0]?.toLowerCase() === "command") {
      tokens = tokens.slice(1);
    }
    const name = tokens[0]?.toLowerCase();
    const rest = tokens.slice(1);
    if (!name) return COMMANDS.help();

    const handler = COMMANDS[name];
    if (!handler) {
      return `Unknown command: ${name}. ${COMMANDS.help()}`;
    }
    return handler(...rest);
  }

  globalThis.run = run;
  globalThis.runCommand = run;

  console.info(
    "[BlockClicker] Dev console: run(\"command\", \"gold\", 999) · run(\"command\", \"help\")",
  );
}
