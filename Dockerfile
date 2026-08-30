FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm \
    && npm install --global pnpm@10.6.1 \
    && rm -rf /var/lib/apt/lists/*
COPY . .
RUN mvn -s .mvn/settings.xml -DskipTests -Prelease package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN mkdir /data && apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
COPY --from=build /workspace/bootstrap/target/bootstrap-0.1.0-SNAPSHOT.jar /app/justvotes.jar
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -q -O - http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-jar", "/app/justvotes.jar"]
