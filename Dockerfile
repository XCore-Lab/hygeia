# Hygeia - GPU container (optional). Needs the NVIDIA Container Toolkit on the host.
#   docker compose run --rm hygeia /opt/venv/bin/python /app/download_models.py   # once: fetch the open-source models into ./models
#   docker compose up                                                             # http://localhost:8000
# The models folder is mounted, not baked into the image.
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends python3.11 python3.11-venv python3-pip libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN python3.11 -m venv /opt/venv && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124 \
    && /opt/venv/bin/pip install -r backend/requirements.txt
COPY backend backend
COPY frontend/dist frontend/dist
COPY download_models.py download_models.py
ENV HF_HUB_CACHE=/app/models/hf_cache/hub PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
EXPOSE 8000
WORKDIR /app/backend
CMD ["/opt/venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "120"]
