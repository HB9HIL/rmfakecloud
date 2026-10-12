# Kubernetes with Helm

The chart is published with every release:

```sh
helm install rmfakecloud oci://ghcr.io/hb9hil/charts/rmfakecloud --version X.Y.Z -f values.yaml
```

It runs one replica: notifications to the tablets, pairing codes and screen sharing live in the memory of the process, a second pod would not see them.

## Values

All options with comments are in [`helm/values.yaml`](https://github.com/hb9hil/rmfakecloud/blob/master/helm/values.yaml). A typical setup behind an ingress with cert-manager:

```yaml
env:
  STORAGE_URL: https://rm.example.com
  RM_SMTP_SERVER: smtp.example.com:587
  RM_SMTP_USERNAME: rmfakecloud@example.com

existingSecret: rmfakecloud

ingress:
  enabled: true
  className: traefik
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  host: rm.example.com
  tlsSecretName: rm-example-com-tls

ocr:
  enabled: true
```

- `env` takes any setting from the [configuration](configuration.md) as environment variable. `STORAGE_URL` must be the public https URL without port.
- `existingSecret` holds the sensitive settings: `JWT_SECRET_KEY`, `RM_SMTP_PASSWORD`, `RMAPI_HWR_APPLICATIONKEY`, `RMAPI_HWR_HMAC`, `ICE_SERVERS`. Without it, the chart creates a secret with a random `JWT_SECRET_KEY` and keeps it on upgrades. This uses `lookup`, which works with `helm` and Flux but not with Argo CD; set `existingSecret` there.
- `ocr.enabled` adds the [OCR service](docker.md#ocr-for-scanned-pdfs) as a second container in the pod, rmfakecloud reaches it on localhost.

## Updates without downtime

The default strategy `Recreate` fits a `ReadWriteOnce` volume. On a `ReadWriteMany` volume (e.g. CephFS, NFS) the new pod can start before the old one stops, rmfakecloud locks the sync root with `flock` across pods:

```yaml
strategy:
  type: RollingUpdate
persistence:
  storageClass: ceph-fs
  accessModes: [ReadWriteMany]
```

## Screen sharing

The chart only serves HTTP. Screen sharing up to tablet software 3.26 needs MQTT on port 8883, see [Traefik on Kubernetes](configuration.md#traefik-on-kubernetes-next-to-the-web-ui).
