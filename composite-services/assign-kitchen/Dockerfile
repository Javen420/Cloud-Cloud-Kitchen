FROM python:3.11-slim

WORKDIR /app

COPY composite-services/assign-kitchen/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY composite-services/assign-kitchen/ .

EXPOSE 8093

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8093"]