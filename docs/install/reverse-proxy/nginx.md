# Nginx

rmfakecloud listens on plain HTTP (`localhost:3000` in this example), nginx terminates HTTPS in front of it.

```nginx
server {
    listen 443 ssl;
    server_name rmfakecloud.example.com;

    ssl_certificate     /etc/letsencrypt/live/rmfakecloud.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rmfakecloud.example.com/privkey.pem;

    # large PDFs and notebooks
    client_max_body_size 200M;
    proxy_buffering off;
    proxy_request_buffering off;

    location / {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect http:// https://;

        # the tablet's sync notifications use a websocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

rmfakecloud configuration:

```sh
STORAGE_URL=https://rmfakecloud.example.com
RM_TRUST_PROXY=1     # client ip from X-Forwarded-For, for the login limiter and fail2ban
RM_HTTPS_COOKIE=1    # the web UI cookie only over https
```

Don't expose port 3000 directly once HTTPS works.

On the tablet, use `https://rmfakecloud.example.com` as the cloud url when installing
[rmfakecloud-proxy](../../remarkable/setup.md).

Screen sharing over MQTT (tablet software < 3.27) needs a TCP stream proxy, see
[configuration](../configuration.md#reverse-proxy-for-mqtt-screen-sharing).
