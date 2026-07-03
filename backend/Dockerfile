# Frontend build stage
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Backend build stage
FROM maven:3.9-eclipse-temurin-25-alpine AS backend-builder
WORKDIR /build
COPY backend/pom.xml .
RUN mvn dependency:go-offline
COPY backend/src ./src
# Copy frontend build artifacts to backend static resources
COPY --from=frontend-builder /frontend/dist src/main/resources/static/
RUN mvn clean package -DskipTests -q

# Runtime stage
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=backend-builder /build/target/*.jar app.jar
EXPOSE 8080
ENV JAVA_OPTS="-XX:+UseStringDeduplication"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
