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


def _parse_changelog(text: str, since_version: str | None = None) -> list[dict]:
    """
    Parst CHANGELOG.md en geeft een lijst van versies terug.
    Als since_version opgegeven is, worden alleen nieuwere versies teruggegeven.
    """
    import re
    versions = []
    current = None

    for line in text.splitlines():
        # Versie header: ## [1.2.3] - 2026-01-01
        m = re.match(r'^## \[(.+?)\](?:\s*-\s*(.+))?', line)
        if m:
            if current:
                versions.append(current)
            current = {"version": m.group(1), "date": (m.group(2) or "").strip(), "sections": {}, "_current_section": None}
            continue

        if current is None:
            continue

        # Sectie header: ### Nieuw / Verbeterd / Gefixt
        m2 = re.match(r'^### (.+)', line)
        if m2:
            current["_current_section"] = m2.group(1)
            current["sections"][m2.group(1)] = []
            continue

        # Bullet
        m3 = re.match(r'^- (.+)', line)
        if m3 and current["_current_section"]:
            current["sections"][current["_current_section"]].append(m3.group(1))

    if current:
        versions.append(current)

    # Verwijder interne helper key
    for v in versions:
        v.pop("_current_section", None)

    # Filter versies die nieuwer zijn dan since_version
    if since_version:
        try:
            from packaging.version import Version
            versions = [v for v in versions if Version(v["version"]) > Version(since_version)]
        except Exception:
            # packaging niet beschikbaar — simpele string vergelijking
            versions = [v for v in versions if v["version"] != since_version]

    return versions


async def get_remote_changelog(since_version: str | None = None) -> list[dict]:
    """Lees CHANGELOG.md van de remote branch (na git fetch)."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "show", "origin/main:CHANGELOG.md",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        text = out.decode(errors="replace")
        return _parse_changelog(text, since_version)
    except Exception:
        return []


async def check_updates_available() -> tuple[bool, list[dict]]:
    """
    Fetch remote en check of we achterliggen.
    Geeft (updates_available, changelog_entries) terug.
    """
    try:
        env = {**os.environ, "HOME": str(Path.home())}
        proc1 = await asyncio.create_subprocess_exec(
            "git", "fetch", "origin",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        await proc1.communicate()

        proc2 = await asyncio.create_subprocess_exec(
            "git", "rev-list", "HEAD..origin/main", "--count",
            cwd=str(APP_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        out, _ = await proc2.communicate()
        count = int(out.decode().strip() or "0")
        updates_available = count > 0

        changelog = []
        if updates_available:
            current_version = _read_app_version()
            changelog = await get_remote_changelog(since_version=current_version)

        return updates_available, changelog
    except Exception:
        return False, []


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
            "Git — code ophalen (fetch)",
            ["git", "fetch", "origin", "main"],
            APP_DIR,
        ),
        (
            "Git — code ophalen (reset)",
            ["git", "reset", "--hard", "origin/main"],
            APP_DIR,
        ),
        (
            "Python — dependencies",
            [str(VENV_PIP), "install", "-q", "-r", "requirements.txt"],
            APP_DIR / "backend",
        ),
        (
            "Frontend — dependencies",
            [npm, "ci", "--prefer-offline", "--no-audit", "--no-fund", "--silent"],
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

        # Controleer of uvicorn binary nog aanwezig is na git reset
        # (git reset --hard kan de venv verwijderen als die eerder getrackt was)
        uvicorn_bin = APP_DIR / ".venv" / "bin" / "uvicorn"
        if not uvicorn_bin.exists():
            yield {"type": "step", "label": "Python — venv herstellen"}
            yield {"type": "log", "line": "uvicorn binary ontbreekt na git reset — force-reinstall..."}
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
                yield {"type": "error", "message": "uvicorn binary nog steeds ontbrekend na reinstall."}
                return
            yield {"type": "log", "line": "uvicorn hersteld."}

        # Stuur "done" EERST zodat de browser het ontvangt,
        # dan herstart de service na een korte vertraging.
        yield {"type": "step", "label": "Service herstarten"}
        yield {"type": "log", "line": "Update klaar — machine herstart over 3 seconden…"}
        yield {"type": "done"}

        # Wacht 3 seconden zodat de WebSocket verbinding netjes gesloten kan worden,
        # dan herstart de service als achtergrondtaak.
        async def _delayed_restart():
            await asyncio.sleep(3)
            # Installeer sudoers voor WiFi rechten
            sudoers_src = APP_DIR / "mixmate-sudoers"
            if sudoers_src.exists():
                try:
                    await asyncio.create_subprocess_exec(
                        "sudo", "cp", str(sudoers_src), "/etc/sudoers.d/mixmate"
                    )
                    await asyncio.create_subprocess_exec(
                        "sudo", "chmod", "440", "/etc/sudoers.d/mixmate"
                    )
                except Exception:
                    pass

            # Zorg dat auto-update.sh uitvoerbaar is
            auto_update = APP_DIR / "auto-update.sh"
            if auto_update.exists():
                try:
                    await asyncio.create_subprocess_exec("chmod", "+x", str(auto_update))
                except Exception:
                    pass

            # Voeg ExecStartPre toe aan service als dat nog ontbreekt
            service_path = "/etc/systemd/system/mixmate.service"
            reload_needed = False
            try:
                with open(service_path, "r") as f:
                    svc = f.read()
                pre_line = f"ExecStartPre={auto_update}"
                if "ExecStartPre" not in svc and auto_update.exists():
                    svc = svc.replace(
                        f"ExecStart=",
                        f"{pre_line}\nExecStart=",
                    )
                    # Wacht op netwerk voor de update werkt
                    svc = svc.replace(
                        "After=network.target",
                        "After=network-online.target\nWants=network-online.target",
                    )
                    # TimeoutStartSec zodat de build niet te vroeg afbreekt
                    if "TimeoutStartSec" not in svc:
                        svc = svc.replace("Restart=on-failure", "TimeoutStartSec=300\nRestart=on-failure")
                    with open(service_path, "w") as f:
                        f.write(svc)
                    reload_needed = True
            except Exception:
                pass

            if reload_needed:
                await asyncio.create_subprocess_exec("sudo", "systemctl", "daemon-reload")

            await asyncio.create_subprocess_exec(
                "sudo", "systemctl", "restart", "mixmate"
            )

        asyncio.create_task(_delayed_restart())

    except Exception as e:
        yield {"type": "error", "message": str(e)}
