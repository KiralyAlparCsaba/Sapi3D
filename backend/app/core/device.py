from user_agents import parse


def extract_device_from_user_agent(user_agent: str) -> dict:
    """
    Extract device information from User-Agent string.

    Returns:
        dict with keys: device_type, device_name, os_name
    """
    if not user_agent:
        return {
            "device_type": "unknown",
            "device_name": "unknown",
            "os_name": "unknown",
        }

    ua = parse(user_agent)

    if ua.is_mobile:
        device_type = "mobile"
    elif ua.is_tablet:
        device_type = "tablet"
    else:
        device_type = "desktop"

    device_name = ua.browser.family or "unknown"
    os_name = ua.os.family or "unknown"

    return {
        "device_type": device_type,
        "device_name": device_name,
        "os_name": os_name,
    }
