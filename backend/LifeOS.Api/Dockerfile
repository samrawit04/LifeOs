# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy the project file first for layer caching
COPY LifeOS.Api.csproj ./
RUN dotnet restore ./LifeOS.Api.csproj

# Copy everything else and publish
COPY . ./
RUN dotnet publish LifeOS.Api.csproj -c Release -o /app/publish --no-restore

# ─── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

# Render injects PORT env var; ASP.NET Core respects ASPNETCORE_URLS
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production

USER $APP_UID

EXPOSE 8080

ENTRYPOINT ["dotnet", "LifeOS.Api.dll"]
