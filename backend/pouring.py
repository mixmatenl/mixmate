"""
Pouring engine: controls pumps/valves based on recipe, monitors loadcell.
Sends real-time progress via WebSocket callback.
"""
import asyncio
from typing import Callable, Awaitable, Optional
from .hardware import gpio, loadcell


class PourSession:
    def __init__(self):
        self.active = False
        self.cancelled = False

    def cancel(self):
        self.cancelled = True


current_session: Optional[PourSession] = None


async def pour_recipe(
    steps: list[dict],  # [{"pin": int, "ml": float, "ml_per_second": float, "name": str}]
    on_progress: Callable[[dict], Awaitable[None]],
):
    """
    Pour a recipe step by step.
    - With loadcell: weight-based control (stops when target weight reached)
    - Without loadcell: time-based control (runs for target_ml / ml_per_second seconds)
    """
    global current_session

    session = PourSession()
    current_session = session
    session.active = True

    has_loadcell = loadcell._hx is not None

    if has_loadcell:
        loadcell.tare()
        await asyncio.sleep(0.3)

    total_ml = sum(s["ml"] for s in steps)
    poured_ml = 0.0

    try:
        for i, step in enumerate(steps):
            if session.cancelled:
                break

            pin = step["pin"]
            target_ml = step["ml"]
            ml_per_second = step["ml_per_second"]
            name = step["name"]
            expected_seconds = target_ml / ml_per_second

            gpio.setup_pin(pin)
            gpio.activate(pin)

            loop = asyncio.get_event_loop()
            start_time = loop.time()
            weight_before = loadcell.get_weight_grams() if has_loadcell else 0.0

            while not session.cancelled:
                await asyncio.sleep(0.05)
                elapsed = loop.time() - start_time

                if has_loadcell:
                    weight_now = loadcell.get_weight_grams()
                    delta = max(0.0, weight_now - weight_before)
                    step_progress = min(delta / target_ml, 1.0)
                    poured_ml = sum(s["ml"] for s in steps[:i]) + delta
                    done = delta >= target_ml * 0.95 or elapsed >= expected_seconds * 1.5
                else:
                    step_progress = min(elapsed / expected_seconds, 1.0)
                    poured_ml = sum(s["ml"] for s in steps[:i]) + step_progress * target_ml
                    done = elapsed >= expected_seconds

                await on_progress({
                    "type": "progress",
                    "step": i,
                    "step_name": name,
                    "step_progress": round(step_progress, 3),
                    "total_progress": round(min(poured_ml / total_ml, 1.0), 3),
                    "poured_ml": round(step_progress * target_ml, 1),
                    "target_ml": target_ml,
                    "mode": "weight" if has_loadcell else "time",
                })

                if done:
                    break

            gpio.deactivate(pin)
            await asyncio.sleep(0.05)

        status = "cancelled" if session.cancelled else "done"
        await on_progress({"type": status, "total_progress": 1.0})

    except Exception as e:
        gpio.deactivate_all()
        await on_progress({"type": "error", "message": str(e)})
    finally:
        gpio.deactivate_all()
        session.active = False
        current_session = None


def cancel_pour():
    global current_session
    if current_session and current_session.active:
        current_session.cancel()
        gpio.deactivate_all()
