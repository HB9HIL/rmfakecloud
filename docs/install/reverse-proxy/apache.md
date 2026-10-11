# Apache

rmfakecloud listens on plain HTTP (`localhost:3000` in this example), Apache terminates HTTPS in front of it.
It needs the modules `proxy`, `proxy_http`, `proxy_wstunnel`, `rewrite`, `headers` and `ssl`.

```apache
<VirtualHost *:443>
  ServerName rmfakecloud.example.com

  SSLEngine on
  SSLCertificateFile    /etc/letsencrypt/live/rmfakecloud.example.com/fullchain.pem
  SSLCertificateKeyFile /etc/letsencrypt/live/rmfakecloud.example.com/privkey.pem

  ProxyRequests Off
  ProxyPreserveHost On
  RequestHeader set X-Forwarded-Proto "https"

  # the tablet's sync notifications use a websocket
  RewriteEngine on
  RewriteCond %{HTTP:Upgrade} websocket [NC]
  RewriteCond %{HTTP:Connection} upgrade [NC]
  RewriteRule ^/?(.*) "ws://localhost:3000/$1" [P,L]

  ProxyPass        / http://localhost:3000/
  ProxyPassReverse / http://localhost:3000/
</VirtualHost>
```

`apachectl configtest` checks the config, `apachectl graceful` loads it.

rmfakecloud configuration:

```sh
STORAGE_URL=https://rmfakecloud.example.com
RM_TRUST_PROXY=1     # client ip from X-Forwarded-For, for the login limiter and fail2ban
RM_HTTPS_COOKIE=1    # the web UI cookie only over https
```

Don't expose port 3000 directly once HTTPS works.

On the tablet, use `https://rmfakecloud.example.com` as the cloud url when installing
[rmfakecloud-proxy](../../remarkable/setup.md).
