FROM alpine:3.18

# تثبيت أدوات التشغيل
RUN apk add --no-cache ca-certificates

# نسخ ملف pocketbase والبيانات
WORKDIR /app
COPY pocketbase /app/pocketbase
COPY pb_public /app/pb_public
COPY pb_data /app/pb_data

# إعطاء صلاحيات تشغيل للملف
RUN chmod +x /app/pocketbase

# تشغيل السيرفر
CMD ["/app/pocketbase", "serve", "--http=0.0.0.0:10000", "--publicDir=pb_public"]
