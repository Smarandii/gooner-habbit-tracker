# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

COPY ./index.html .
COPY ./characters /app/characters/
COPY ./css /app/css/
COPY ./js /app/js/
COPY server.py .

# Define environment variable for Python output and internal port
ENV PYTHONUNBUFFERED 1
ENV APP_INTERNAL_PORT 8000 # Default internal port, can be overridden by docker-compose

# Run server.py when the container launches
CMD ["python", "server.py"]