FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files
COPY CubeStatsApi/CubeStatsApi.csproj ./CubeStatsApi/
COPY CubeStatsApi/*.csproj ./CubeStatsApi/
COPY CubeStatsApi/ ./CubeStatsApi/

# Restore dependencies
RUN dotnet restore CubeStatsApi/CubeStatsApi.csproj

# Build and publish
WORKDIR /src/CubeStatsApi
RUN dotnet publish -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -o /app/publish

# Final stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Install SQLite if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy published files
COPY --from=build /app/publish .

# Create data directory
RUN mkdir -p /app/data

# Set environment
ENV ASPNETCORE_URLS=http://+:5000
ENV DOTNET_RUNNING_IN_CONTAINER=true

# Expose port
EXPOSE 5000

# Entry point
ENTRYPOINT ["./cubestats"]
