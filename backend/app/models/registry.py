"""Lazy model registry with VRAM-aware device placement.

Every heavy model is created once, on first use, behind a process-wide lock so
the 6 GB laptop GPU is never asked to hold two forward passes at the same time.
Models declare a device policy:

* ``gpu_resident``   - loaded to the GPU once and kept there
* ``gpu_on_demand``  - lives on the CPU; moved to the GPU for a call and back
* ``cpu``            - never touches the GPU
"""
from __future__ import annotations

import contextlib
import logging
import threading
import time
from typing import Callable

import torch

from .. import config

log = logging.getLogger("hygeia.registry")


def resolve_device() -> torch.device:
    if config.DEVICE == "cpu":
        return torch.device("cpu")
    if config.DEVICE == "cuda" or (config.DEVICE == "auto" and torch.cuda.is_available()):
        return torch.device("cuda")
    return torch.device("cpu")


DEVICE = resolve_device()
GPU_LOCK = threading.RLock()


def gpu_mem() -> dict:
    if DEVICE.type != "cuda":
        return {"device": "cpu"}
    free, total = torch.cuda.mem_get_info()
    return {
        "device": torch.cuda.get_device_name(0),
        "total_mb": round(total / 2**20),
        "free_mb": round(free / 2**20),
        "allocated_mb": round(torch.cuda.memory_allocated() / 2**20),
        "reserved_mb": round(torch.cuda.memory_reserved() / 2**20),
    }


class ModelSlot:
    def __init__(self, name: str, loader: Callable[[], object], policy: str = "gpu_resident"):
        self.name = name
        self.loader = loader
        self.policy = policy if DEVICE.type == "cuda" else "cpu"
        self.obj = None
        self.error: str | None = None
        self.load_seconds: float | None = None
        self.lock = threading.Lock()

    @property
    def status(self) -> str:
        if self.obj is not None:
            return "ready"
        if self.error:
            return "error"
        return "not_loaded"

    def get(self):
        if self.obj is not None:
            return self.obj
        with self.lock:
            if self.obj is None and self.error is None:
                t0 = time.time()
                try:
                    log.info("loading %s (%s)", self.name, self.policy)
                    obj = self.loader()
                    if self.policy == "gpu_resident" and hasattr(obj, "to"):
                        obj.to(DEVICE)
                    self.obj = obj
                    self.load_seconds = round(time.time() - t0, 1)
                    log.info("loaded %s in %.1fs  %s", self.name, self.load_seconds, gpu_mem())
                except Exception as e:  # noqa: BLE001
                    self.error = f"{type(e).__name__}: {e}"
                    log.exception("failed to load %s", self.name)
                    raise
        if self.obj is None:
            raise RuntimeError(f"{self.name} unavailable: {self.error}")
        return self.obj

    @contextlib.contextmanager
    def on_device(self):
        """Yield the model placed according to its policy; serialises GPU use."""
        obj = self.get()
        with GPU_LOCK:
            moved = False
            if self.policy == "gpu_on_demand" and hasattr(obj, "to"):
                obj.to(DEVICE)
                moved = True
            try:
                yield obj
            finally:
                if moved:
                    obj.to("cpu")
                    torch.cuda.empty_cache()


class Registry:
    def __init__(self):
        self.slots: dict[str, ModelSlot] = {}

    def register(self, name: str, loader: Callable[[], object], policy: str = "gpu_resident") -> ModelSlot:
        slot = ModelSlot(name, loader, policy)
        self.slots[name] = slot
        return slot

    def status(self) -> dict:
        return {
            n: {"status": s.status, "policy": s.policy, "error": s.error, "load_seconds": s.load_seconds}
            for n, s in self.slots.items()
        }

    def warmup(self, names: list[str] | None = None) -> dict:
        out = {}
        for n, s in self.slots.items():
            if names and n not in names:
                continue
            try:
                obj = s.get()
                if hasattr(obj, "warm"):          # one-time CUDA/cuDNN initialisation off the request path
                    try:
                        with s.on_device() as placed:
                            placed.warm()
                    except Exception as e:  # noqa: BLE001
                        log.warning("warm-up of %s failed: %s", n, e)
                out[n] = "ready"
            except Exception as e:  # noqa: BLE001
                out[n] = f"error: {e}"
        return out


registry = Registry()
