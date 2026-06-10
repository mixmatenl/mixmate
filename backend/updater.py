"""
OTA update engine.
Runs git pull, reinstalls deps, rebuilds frontend, restarts systemd service.
Streams output line-by-line via an async generator.
"""
import asyncio
import os
import shutil
from pathlib import Path

APP_DIR = Path(__file__).parent.parent.resolve()
VENV_PIP = APP_DIR / ".venv" / "bin" / "pip"


def _find_npm():
    """Find npm binary — tries PATH first, then common locations."""
    # 1. shutil.which uses current process PATH
    found = shutil.which("npm")
    if found:
        return found
    # 2. Common locations on Debian/Ubuntu/Pi
    for p in [
        "/usr/bin/npm",
        "/usr/local/bin/npm",
        "/opt/nodejs/bin/npm",
    ]:
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    # 3. NVM per-user installs
    home = Path.home()
    for nvm_path in sorted((home / ".nvm" / "versions" / "node").glob("*/bin/npm"), reverse=True):
        if nvm_path.is_file():
            return str(nvm_path)
    return "npm"  # fallback, will fail with a clear error


NPM = _find_npm()



def _read_app_version() -> str:
    """Lees versie uit frontend/package.json."""
    try:
        import json
        pkg = APP_DIR / "frontend" / "package.json"
        return json.loads(pkg.read_text()).get("version", "?")
    except Exception:
        return "?"


async def get_version_info() -> dict:
    """Return current git commit info + app version."""
    info = {"commit": "onbekend", "message": "", "date": "", "branch": "", "version": _read_app_version()}
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "log", "-1", "--pretty=format:%H|%s|%ci|%D",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        parts = out.decode().strip().split("|", 3)
        if len(parts) >= 3:
            info["commit"] = parts[0][:8]
            info["message"] = parts[1]
            info["date"] = parts[2][:10]
            info["branch"] = parts[3] if len(parts) > 3 else ""
    except Exception:
        pass
    return info


async def check_updates_available() -> bool:
    """Fetch remote and check if we're behind."""
    try:
        env = {**os.environ, "HOME": str(Path.home())}
        # Fetch latest remote info
        proc1 = await asyncio.create_subprocess_exec(
            "git", "fetch", "origin",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        await proc1.communicate()

        # Compare local HEAD with remote
        proc2 = await asyncio.create_subprocess_exec(
            "git", "rev-list", "HEAD..origin/main", "--count",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        out, _ = await proc2.communicate()
        count = int(out.decode().strip() or "0")
        return count > 0
    except Exception:
        return False


async def run_update():
    """
    Full update sequence. Yields progress dicts:
    {"type": "step", "label": "..."}
    {"type": "log",  "line": "..."}
    {"type": "done"} or {"type": "error", "message": "..."}
    """
    env_extra = {
        **os.environ,
        "HOME": str(Path.home()),
        "PATH": os.environ.get("PATH", "") + ":/usr/bin:/usr/local/bin:/usr/local/sbin",
        "NPM_CONFIG_UPDATE_NOTIFIER": "false",
    }

    npm = _find_npm()
    yield {"type": "log", "line": f"npm gevonden: {npm}"}
    yield {"type": "log", "line": f"App map: {APP_DIR}"}

    steps = [
        (
            "Git — code ophalen",
            ["git", "pull"],
            APP_DIR,
        ),
        (
            "Python — dependencies",
            [str(VENV_PIP), "install", "-q", "-r", "requirements.txt"],
            APP_DIR / "backend",
        ),
        (
            "Frontend — dependencies",
            [npm, "install", "--prefer-offline", "--no-audit", "--no-fund"],
            APP_DIR / "frontend",
        ),
        (
            "Frontend — bouwen",
            [npm, "run", "build"],
            APP_DIR / "frontend",
        ),
    ]

    try:
        for label, cmd, cwd in steps:
            yield {"type": "step", "label": label}
            yield {"type": "log", "line": f"$ {' '.join(str(c) for c in cmd)}"}

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=str(cwd),
                env=env_extra,
            )
            async for raw in proc.stdout:
                line = raw.decode(errors="replace").rstrip()
                if line:
                    yield {"type": "log", "line": line}
            await proc.wait()

            if proc.returncode != 0:
                yield {
                    "type": "error",
                    "message": f"Stap mislukt: {label} (exit {proc.returncode})"
                }
                return

        # Stuur "done" EERST zodat de browser het ontvangt,
        # dan herstart de service na een korte vertraging.
        yield {"type": "step", "label": "Service herstarten"}
        yield {"type": "log", "line": "Update klaar — machine herstart over 3 seconden…"}
        yield {"type": "done"}

        # Wacht 3 seconden zodat de WebSocket verbinding netjes gesloten kan worden,
        # dan herstart de service als achtergrondtaak.
        async def _delayed_restart():
            await asyncio.sleep(3)
            await asyncio.create_subprocess_exec(
                "sudo", "systemctl", "restart", "mixmate"
            )

        asyncio.create_task(_delayed_restart())

    except Exception as e:
        yield {"type": "error", "message": str(e)}
