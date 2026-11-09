# Integration matrix

| Provider | Status | Transport | Notes |
|---|---|---|---|
| Home Assistant | MVP code implemented, live validation pending | REST / WebSocket | Requires HA_URL and HA_TOKEN |
| SmartThings | Planned | OAuth REST and events | Developer account and platform requirements must be validated |
| Tuya / Smart Life | Planned | Tuya Cloud | Account pairing and quotas must be validated |
| Xiaomi Home | Research | Official Xiaomi Home through Home Assistant first | No unapproved private APIs |
| Amazon Alexa | Research | Official developer APIs only | No general-purpose control of a user's Alexa devices via Smart Home Skill API |
| Google Home | Research | Official Home APIs | Windows SDK access limitations |
| MQTT | Planned | Local broker | Authenticate securely |
| Matter | Research | Authorized controller | Hardware/controller prerequisites |
| Hue | Planned | Official Hue API | Bridge pairing |

This is not an assertion of working support for unimplemented providers. Vendor terms and API scopes are checked before development.
