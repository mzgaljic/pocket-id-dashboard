# Dashboard Customization

The Pocket ID Dashboard allows you to customize how applications are presented using 
a `customize.yaml` file. This is configured via the optional `CUSTOMIZE_METADATA_FILE`
environment variable. This special yaml file lets you add a descriptions to an app or
hide a certain app.

ℹ️ To reload this config at runtime, simply click `Clear Server Cache` in the dropdown in the dashboard
UI (admin only).


## YAML Schema

The `customize.yaml` file uses the following schema:
```yaml
oidcClients:
  <alias>:
    filter: <the client id or name>
    description: <description to display>
    hidden: true # optional, default is false
```
`<alias>` can be anything. Filters may also be defined like this:
```yaml
oidcClients:
  <alias>:
    filter:
      field: <`id` OR `name`>
      value: <value>
```

**Realistic example:**
```yaml
oidcClients:
  grafana:
    filter: Grafana
    description: "Application metrics and logs"
    
  openWebUi:
    filter: Open WebUI
    description: "AI Chat"
    
  paperlessNgx:
    filter: Paperless
    description: "Document management system"
    
  libreSpeed:
    filter: 71b0889b-d5ny-470c-8f92-31b0be1d1bc0
    description: "Speed test to homelab"
    hidden: true
```