"""
Hardware abstraction layer.
On Raspberry Pi: uses RPi.GPIO for pumps/valves and hx711 for loadcell.
On other systems: uses mock implementations for development/testing.
"""
import os
import platform
from typing import Set

IS_PI = platform.machine().startswith("arm") or platform.machine().startswith("aarch")

try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    HAS_GPIO = True
except ImportError:
    HAS_GPIO = False

try:
    from hx711 import HX711 as _HX711
    HAS_HX711 = True
except ImportError:
    HAS_HX711 = False


class GPIOController:
    def __init__(self):
        self._active_pins: Set[int] = set()

    def setup_pin(self, pin: int):
        if HAS_GPIO:
            GPIO.setup(pin, GPIO.OUT, initial=GPIO.LOW)

    def activate(self, pin: int):
        self._active_pins.add(pin)
        if HAS_GPIO:
            GPIO.output(pin, GPIO.HIGH)
        else:
            print(f"[MOCK GPIO] PIN {pin} ON")

    def deactivate(self, pin: int):
        self._active_pins.discard(pin)
        if HAS_GPIO:
            GPIO.output(pin, GPIO.LOW)
        else:
            print(f"[MOCK GPIO] PIN {pin} OFF")

    def deactivate_all(self):
        for pin in list(self._active_pins):
            self.deactivate(pin)

    def cleanup(self):
        self.deactivate_all()
        if HAS_GPIO:
            GPIO.cleanup()


class LoadCell:
    def __init__(self):
        self._tare_offset = 0.0
        self._mock_weight = 0.0
        self._scale = float(os.environ.get("LOADCELL_SCALE", "1.0"))
        self._dout_pin = int(os.environ.get("LOADCELL_DOUT", "5"))
        self._sck_pin = int(os.environ.get("LOADCELL_SCK", "6"))

        if HAS_HX711:
            self._hx = _HX711(self._dout_pin, self._sck_pin)
            self._hx.set_reading_format("MSB", "MSB")
            self._hx.set_reference_unit(self._scale)
            self._hx.reset()
            self._hx.tare()
        else:
            self._hx = None

    def get_pins(self) -> dict:
        return {"dout_pin": self._dout_pin, "sck_pin": self._sck_pin}

    def set_pins(self, dout_pin: int, sck_pin: int):
        self._dout_pin = dout_pin
        self._sck_pin = sck_pin
        self._persist_env("LOADCELL_DOUT", str(dout_pin))
        self._persist_env("LOADCELL_SCK", str(sck_pin))

    def tare(self):
        if self._hx:
            self._hx.tare()
        else:
            self._mock_weight = 0.0
            self._tare_offset = 0.0

    def get_weight_grams(self) -> float:
        if self._hx:
            val = self._hx.get_weight(5)
            return max(0.0, float(val))
        return max(0.0, self._mock_weight)

    def get_raw_value(self) -> float:
        """Return raw (uncalibrated) reading — used during calibration."""
        if self._hx:
            # Temporarily reset reference unit to 1 to get raw value
            self._hx.set_reference_unit(1)
            raw = self._hx.get_weight(5)
            self._hx.set_reference_unit(self._scale)
            return float(raw)
        # In mock mode: simulate a raw value as if scale=1 means ~8500 units/gram
        return self._mock_weight * 8500.0

    def calibrate(self, known_weight_grams: float) -> float:
        """
        Calculate scale factor from a known weight currently on the scale.
        Returns the new scale factor.
        """
        if known_weight_grams <= 0:
            raise ValueError("Known weight must be > 0")

        if self._hx:
            self._hx.set_reference_unit(1)
            raw = self._hx.get_weight(10)
            scale = raw / known_weight_grams
            self._scale = scale
            self._hx.set_reference_unit(scale)
        else:
            # Mock: pretend the raw value is known_weight * 8500
            raw = known_weight_grams * 8500.0
            self._scale = raw / known_weight_grams  # = 8500.0

        self._persist_scale(self._scale)
        return self._scale

    def set_scale(self, scale: float):
        self._scale = scale
        if self._hx:
            self._hx.set_reference_unit(scale)

    def _persist_scale(self, scale: float):
        self._persist_env("LOADCELL_SCALE", str(scale))

    def _persist_env(self, key: str, value: str):
        os.environ[key] = value
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        lines = []
        replaced = False
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith(f"{key}="):
                        lines.append(f"{key}={value}\n")
                        replaced = True
                    else:
                        lines.append(line)
        if not replaced:
            lines.append(f"{key}={value}\n")
        with open(env_path, "w") as f:
            f.writelines(lines)

    # Only used in mock/dev mode
    def _mock_add(self, grams: float):
        self._mock_weight += grams


gpio = GPIOController()
loadcell = LoadCell()
