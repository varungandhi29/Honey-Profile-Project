FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python train.py
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s CMD wget -qO- http://localhost:8000/health || exit 1
CMD ["python","main.py"]
