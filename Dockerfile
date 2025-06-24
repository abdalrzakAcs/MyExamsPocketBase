FROM alpine:3.18

RUN apk add --no-cache curl ca-certificates && \
    curl -L -o /app/pocketbase.zip https://github.com/pocketbase/pocketbase/releases/download/v0.18.4/pocketbase_0.18.4_linux_amd64.zip && \
    unzip /app/pocketbase.zip -d /app && \
    chmod +x /app/pocketbase

WORKDIR /app
COPY pb_public /app/pb_public
COPY pb_data /app/pb_data

CMD ["/app/pocketbase", "serve", "--http=0.0.0.0:10000", "--publicDir=pb_public"]
