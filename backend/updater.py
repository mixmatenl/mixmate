"""
OTA update engine.
Runs git pull, reinstalls deps, rebuilds frontend, restarts systemd service.
Streams output line-by-line via an async generator.
"""
import asyncio
import os
import shutil
from pathlib import Path

APP_DIR  = Path(__file__).parent.parent.resolve()
VENV_PIP = APP_DIR / ".venv" / "bin" / "pip"


def _find_npm():
    found = shutil.which("npm")
    if found:
        return found
    for p in ["/usr/bin/npm", "/usr/local/bin/npm", "/opt/nodejs/bin/npm"]:
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    home = Path.home()
    for nvm_path in sorted((home / ".nvm" / "versions" / "node").glob("*/bin/npm"), reverse=True):
        if nvm_path.is_file():
            return str(nvm_path)
    return "npm"


NPM = _find_npm()


def _read_app_version() -> str:
    try:
        import json
        pkg = APP_DIR / "frontend" / "package.json"
        return json.loads(pkg.read_text()).get("version", "?")
    except Exception:
        return "?"


async def get_version_info() -> dict:
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
            info["commit"]  = parts[0][:8]
            info["message"] = parts[1]
            info["date"]    = parts[2][:10]
            info["branch"]  = parts[3] if len(parts) > 3 else ""
    except Exception:
        pass
    return info


def _parse_changelog(text: str, since_version: str | None = None) -> list[dict]:
    import re
    versions = []
    current  = None
    for line in text.splitlines():
        m = re.match(r'^## \[(.+?)\](?:\s*-\s*(.+))?', line)
        if m:
            if current:
                versions.append(current)
            current = {"version": m.group(1), "date": (m.group(2) or "").strip(), "sections": {}, "_current_section": None}
            continue
        if current is None:
            continue
        m2 = re.match(r'^### (.+)', line)
        if m2:
            current["_current_section"] = m2.group(1)
            current["sections"][m2.group(1)] = []
            continue
        m3 = re.match(r'^- (.+)', line)
        if m3 and current["_current_section"]:
            current["sections"][current["_current_section"]].append(m3.group(1))
    if current:
        versions.append(current)
    for v in versions:
        v.pop("_current_section", None)
    if since_version:
        try:
            from packaging.version import Version
            versions = [v for v in versions if Version(v["version"]) > Version(since_version)]
        except Exception:
            versions = [v for v in versions if v["version"] != since_version]
    return versions


async def get_remote_changelog(since_version: str | None = None) -> list[dict]:
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "show", "origin/main:CHANGELOG.md",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        return _parse_changelog(out.decode(errors="replace"), since_version)
    except Exception:
        return []


async def check_updates_available() -> tuple[bool, list[dict]]:
    try:
        env = {**os.environ, "HOME": str(Path.home())}
        p1 = await asyncio.create_subprocess_exec(
            "git", "fetch", "origin",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        await p1.communicate()
        p2 = await asyncio.create_subprocess_exec(
            "git", "rev-list", "HEAD..origin/main", "--count",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        out, _ = await p2.communicate()
        count = int(out.decode().strip() or "0")
        changelog = await get_remote_changelog(since_version=_read_app_version()) if count > 0 else []
        return count > 0, changelog
    except Exception:
        return False, []


async def run_update():
    """
    Full update sequence. Yields progress dicts:
      {"type": "step",  "label": "..."}
      {"type": "log",   "line":  "..."}
      {"type": "done"}
      {"type": "error", "message": "..."}
    """
    env_extra = {
        **os.environ,
        "HOME": str(Path.home()),
        "PATH": os.environ.get("PATH", "") + ":/usr/bin:/usr/local/bin:/usr/local/sbin",
        "NPM_CONFIG_UPDATE_NOTIFIER": "false",
    }

    npm = _find_npm()
    yield {"type": "log", "line": f"npm: {npm}  |  app: {APP_DIR}"}

    steps = [
        ("Git — code ophalen",        ["git", "fetch", "origin", "main"],              APP_DIR),
        ("Git — code toepassen",      ["git", "reset", "--hard", "origin/main"],       APP_DIR),
        ("Python — dependencies",     [str(VENV_PIP), "install", "-q", "-r", "requirements.txt"], APP_DIR / "backend"),
        ("Frontend — dependencies",   [npm, "install", "--no-audit", "--no-fund", "--silent"],     APP_DIR / "frontend"),
        ("Frontend — bouwen",         [npm, "run", "build"],                            APP_DIR / "frontend"),
    ]

    try:
        for label, cmd, cwd in steps:
            yield {"type": "step", "label": label}
            yield {"type": "log",  "line": f"$ {' '.join(str(c) for c in cmd)}"}

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
                yield {"type": "error", "message": f"Stap mislukt: {label} (exit {proc.returncode})"}
                return

        # Controleer of uvicorn nog aanwezig is na git reset
        uvicorn_bin = APP_DIR / ".venv" / "bin" / "uvicorn"
        if not uvicorn_bin.exists():
            yield {"type": "step", "label": "Python — venv herstellen"}
            proc = await asyncio.create_subprocess_exec(
                str(VENV_PIP), "install", "--quiet", "--force-reinstall", "uvicorn[standard]",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=str(APP_DIR),
                env=env_extra,
            )
            async for raw in proc.stdout:
                line = raw.decode(errors="replace").rstrip()
                if line:
                    yield {"type": "log", "line": line}
            await proc.wait()
            if not uvicorn_bin.exists():
                yield {"type": "error", "message": "uvicorn binary ontbreekt na reinstall."}
                return

        # Stuur done EERST zodat de browser/portaal het ontvangt vóór de herstart
        yield {"type": "step", "label": "Herstarten"}
        yield {"type": "log",  "line": "Update klaar — machine herstart over 3 seconden…"}
        yield {"type": "done"}

        async def _delayed_restart():
            await asyncio.sleep(3)
            # Sudoers bijwerken
            sudoers_src = APP_DIR / "mixmate-sudoers"
            if sudoers_src.exists():
                try:
                    p = await asyncio.create_subprocess_exec(
                        "sudo", "cp", str(sudoers_src), "/etc/sudoers.d/mixmate"
                    )
                    await p.wait()
                    p = await asyncio.create_subprocess_exec(
                        "sudo", "chmod", "440", "/etc/sudoers.d/mixmate"
                    )
                    await p.wait()
                except Exception:
                    pass
            # Herstart de service
            p = await asyncio.create_subprocess_exec("sudo", "systemctl", "restart", "mixmate")
            await p.wait()

        asyncio.create_task(_delayed_restart())

    except Exception as e:
        yield {"type": "error", "message": str(e)}
