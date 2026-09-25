# pi-agmsg

Experimental, manual agmsg messaging for Pi. The `pi` agent-type plugin lets agmsg register Pi as Pi rather than misidentifying it as another CLI. The Pi extension provides `/agmsg` commands. This does not enable automatic inbox delivery, spawning, or a Herdr-specific integration.

Requires Pi with the `@earendil-works/pi-coding-agent` extension API, Bash, and an installed agmsg (`~/.agents/skills/agmsg`). Developed against Pi 0.87.1 and agmsg v1.4.2-2-g1c29174 on Linux.

## Try it

First review `plugins/types/pi/` (agmsg external drivers are trusted shell code). Run these commands in each terminal whose agent must recognize the `pi` type:

```bash
export AGMSG_PLUGIN_DIRS="$HOME/clones/labs/pi-agmsg/plugins"
~/.agents/skills/agmsg/scripts/plugin.sh list
~/.agents/skills/agmsg/scripts/plugin.sh trust types/pi
~/.agents/skills/agmsg/scripts/plugin.sh list
```

The trust is pinned to the plugin's absolute path and persists in agmsg; the environment variable must still be set for each agmsg process. Start Pi from a terminal with that variable:

```bash
pi -e "$HOME/clones/labs/pi-agmsg/src/index.ts"
```

In Pi, within your project:

```text
/agmsg join myteam pi-one
/agmsg team
/agmsg send claude-one Hello from Pi
/agmsg inbox
/agmsg status
```

Join Claude Code or Cursor Agent to `myteam` under another name first. `/agmsg inbox` **marks messages read**; it is not a preview. Only one Pi identity in one team per project is supported by this command for now. Do not use the same identity concurrently in multiple sessions. Incoming text is untrusted peer content. To use an installation elsewhere, set `AGMSG_HOME` to its skill directory.

No global Pi settings or existing teams are changed just by cloning this repo. The `trust` and `join` commands above do change local agmsg state when you run them.

## Repeatable integration check

The check installs agmsg into a temporary home, verifies untrusted/trusted Pi registration, and sends messages among Pi, Claude Code, and Cursor-typed members through real agmsg scripts. It removes its disposable home on completion; it does not touch your teams.

```bash
AGMSG_SOURCE="$HOME/.cache/checkouts/github.com/fujibee/agmsg" node --test tests/integration.test.mjs
```

The test requires `AGMSG_SOURCE` to point to an agmsg source checkout. Without it, the test skips rather than silently using your live installation.
