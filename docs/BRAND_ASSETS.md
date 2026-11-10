# Brand icon assets and attribution

The Smart Home PRO integration catalogue uses identifiable, unmodified-brand silhouettes from publicly available icon libraries, each with its own brand color:

- **Home Assistant:** `resources/brand-home-assistant.svg`. Source: [Simple Icons / homeassistant.svg](https://github.com/simple-icons/simple-icons/blob/develop/icons/homeassistant.svg).
- **Samsung SmartThings:** `resources/brand-smartthings.svg`. Source: [Simple Icons / smartthings.svg](https://github.com/simple-icons/simple-icons/blob/develop/icons/smartthings.svg).
- **Tuya / Smart Life:** `resources/brand-tuya.svg`. Source: [Dashboard Icons / tuya-smart-inc.svg](https://github.com/homarr-labs/dashboard-icons/blob/main/svg/tuya-smart-inc.svg).

Assets are locally bundled so they work offline; no external icon CDN or telemetry is involved.

Brand names and logos are trademarks of their respective owners. Their appearance here identifies compatible third-party integrations only and does not indicate sponsorship, certification or affiliation. Confirm each trademark owner's brand usage conditions before publishing in a commercial storefront. The Home Assistant brand documentation has specific conditions for commercial use: https://contributors.home-assistant.io/brand/name-and-logo/.

The prior generic `Device Control` action is intentionally omitted from the `manifest.json` catalogue. The runtime retains a legacy handler temporarily for users with saved profiles; old actions are not offered for new assignment.
