# Build stage
FROM eclipse-temurin:23-jdk AS build
WORKDIR /app

# Copy the Maven wrapper properties and executable
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make the wrapper executable (in case it lost its +x permission)
RUN chmod +x ./mvnw

# Resolve dependencies
RUN ./mvnw dependency:go-offline -B

# Copy the project source
COPY src ./src

# Build the application
RUN ./mvnw clean package -DskipTests

# Run stage
FROM eclipse-temurin:23-jre-alpine
WORKDIR /app

# Map the uploads directory as a volume if needed (e.g. for chat uploads)
VOLUME /tmp
VOLUME /app/uploads

# Apply a non-root user for better security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
