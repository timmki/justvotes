FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY . .
RUN mvn -s .mvn/settings.xml -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN mkdir /data
COPY --from=build /workspace/bootstrap/target/bootstrap-0.1.0-SNAPSHOT.jar /app/justvotes.jar
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -q -O - http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-jar", "/app/justvotes.jar"]
