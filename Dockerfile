# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy the project file first for layer caching
COPY backend/lifeos.api/LifeOS.Api.csproj ./backend/lifeos.api/
RUN dotnet restore ./backend/lifeos.api/LifeOS.Api.csproj

# Copy backend source and publish
COPY backend/lifeos.api/. ./backend/lifeos.api/
WORKDIR /src/backend/lifeos.api
RUN dotnet publish LifeOS.Api.csproj -c Release -o /app/publish --no-restore

# ─── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=build /app/publish ./

# Render injects PORT env var; ASP.NET Core respects ASPNETCORE_URLS
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production

USER appuser

EXPOSE 8080

ENTRYPOINT ["dotnet", "LifeOS.Api.dll"]
