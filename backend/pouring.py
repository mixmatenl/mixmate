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
    Each step activates a pump/valve until the expected ml is reached (weight-based),
    with time-based fallback.
    """
    global current_session

    session = PourSession()
    current_session = session
    session.active = True

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

            gpio.setup_pin(pin)

            weight_before = loadcell.get_weight_grams()
            expected_seconds = target_ml / ml_per_second
            deadline = asyncio.get_event_loop().time() + expected_seconds * 1.5

            gpio.activate(pin)

            is_mock = not hasattr(loadcell, '_hx') or loadcell._hx is None
            loop = asyncio.get_event_loop()
            start_time = loop.time()
            weight_mode_confirmed = False
            mode = "time"  # default; switch to "weight" if loadcell responds

            while not session.cancelled:
                await asyncio.sleep(0.1)
                elapsed = loop.time() - start_time

                # Mock simulation
                if is_mock:
                    loadcell._mock_add(ml_per_second * 0.1)

                weight_now = loadcell.get_weight_grams()
                delta = weight_now - weight_before

                # After 1s, decide if loadcell is responding
                if not weight_mode_confirmed and elapsed >= 1.0:
                    weight_mode_confirmed = True
                    mode = "weight" if (delta > 0.5 or is_mock) else "time"

                if mode == "weight":
                    step_progress = min(delta / target_ml, 1.0)
                    poured_ml = sum(s["ml"] for s in steps[:i]) + delta
                else:
                    step_progress = min(elapsed / expected_seconds, 1.0)
                    poured_ml = sum(s["ml"] for s in steps[:i]) + (elapsed / expected_seconds * target_ml)

                await on_progress({
                    "type": "progress",
                    "step": i,
                    "step_name": name,
                    "step_progress": round(step_progress, 3),
                    "total_progress": round(min(poured_ml / total_ml, 1.0), 3),
                    "poured_ml": round(delta if mode == "weight" else poured_ml - sum(s["ml"] for s in steps[:i]), 1),
                    "target_ml": target_ml,
                    "weight_g": round(weight_now, 1),
                    "mode": mode,
                })

                elapsed_ok = elapsed >= expected_seconds
                weight_ok = mode == "weight" and delta >= target_ml * 0.95

                if weight_ok or elapsed_ok:
                    break

            gpio.deactivate(pin)
            await asyncio.sleep(0.2)

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
