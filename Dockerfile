# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
# We will mount the 'characters' directory as a volume in docker-compose,
# so it doesn't strictly need to be copied here if it's always mounted.
# However, copying it provides a fallback if the volume isn't mounted.
COPY index.html .
COPY characters .
COPY css .
COPY js .
COPY server.py .

# Define environment variable for Python output and internal port
ENV PYTHONUNBUFFERED 1
ENV APP_INTERNAL_PORT 8000 # Default internal port, can be overridden by docker-compose

# Run server.py when the container launches
CMD ["python", "server.py"]