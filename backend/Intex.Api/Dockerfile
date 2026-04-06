FROM mcr.microsoft.com/dotnet/sdk:10.0 AS base
WORKDIR /app

COPY . ./
RUN dotnet restore
RUN dotnet publish -c Release -o /out

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

CMD ["dotnet", "/out/Intex.Api.dll"]
