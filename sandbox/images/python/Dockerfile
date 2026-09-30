FROM python:3.11-alpine

RUN addgroup -g 10001 sandbox && \
    adduser -D -u 10001 -G sandbox sandbox && \
    mkdir -p /workspace && \
    chown -R sandbox:sandbox /workspace

USER 10001:10001
WORKDIR /workspace

CMD ["python3"]
