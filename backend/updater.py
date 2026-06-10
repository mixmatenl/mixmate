"""
OTA update engine.
Runs git pull, reinstalls deps, rebuilds frontend, restarts systemd service.
Streams output line-by-line via an async generator.
"""
import asyncio
import os
from pathlib import Path

APP_DIR = Path(__file__).parent.parent.resolve()
VENV_PYTHON = APP_DIR / ".venv" / "bin" / "python3"
VENV_PIP = APP_DIR / ".venv" / "bin" / "pip"
NPM = "npm"


async def _run(cmd, cwd=None):
    """Yield (stream, line) tuples from a subprocess."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(cwd or APP_DIR),
    )
    async for raw in proc.stdout:
        yield raw.decode(errors="replace").rstrip()
    await proc.wait()


async def get_version_info() -> dict:
    """Return current git commit info."""
    info = {"commit": "onbekend", "message": "", "date": "", "branch": ""}
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
        proc = await asyncio.create_subprocess_exec(
            "git", "fetch", "--dry-run",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, err = await proc.communicate()
        # If fetch --dry-run has output, there are remote changes
        return bool(err.strip())
    except Exception:
        return False


async def run_update():
    """
    Full update sequence. Yields progress dicts:
    {"type": "step", "label": "..."}
    {"type": "log", "line": "..."}
    {"type": "done"} or {"type": "error", "message": "..."}
    """
    steps = [
        ("Git — code ophalen",       ["git", "pull", "--rebase", "origin", "HEAD"], APP_DIR),
        ("Python — dependencies",    [str(VENV_PIP), "install", "-q", "-r", "requirements.txt"], APP_DIR / "backend"),
        ("Frontend — dependencies",  [NPM, "install", "--silent"], APP_DIR / "frontend"),
        ("Frontend — bouwen",        [NPM, "run", "build"], APP_DIR / "frontend"),
    ]

    try:
        for label, cmd, cwd in steps:
            yield {"type": "step", "label": label}
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=str(cwd),
            )
            async for raw in proc.stdout:
                line = raw.decode(errors="replace").rstrip()
                if line:
                    yield {"type": "log", "line": line}
            await proc.wait()
            if proc.returncode != 0:
                yield {"type": "error", "message": f"Stap mislukt: {label} (exit {proc.returncode})"}
                return

        # Restart service if running under systemd
        yield {"type": "step", "label": "Service herstarten"}
        restart = await asyncio.create_subprocess_exec(
            "sudo", "systemctl", "restart", "mixmate",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        await restart.communicate()
        if restart.returncode == 0:
            yield {"type": "log", "line": "Service herstart via systemd"}
        else:
            yield {"type": "log", "line": "Systemd niet beschikbaar — herstart handmatig"}

        yield {"type": "done"}

    except Exception as e:
        yield {"type": "error", "message": str(e)}
