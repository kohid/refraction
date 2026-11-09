"""HTTP client for the Refraction publish endpoint.

Pure standard library and no ``bpy`` import, so it runs on a worker thread inside Blender and
can be unit tested with plain Python (see ``integrations/blender/tests``).
"""

import base64
import json
import mimetypes
import os
import uuid
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

API_PATH = "/refraction/v1/blender"
USER_AGENT = "RefractionBlenderPublisher/1.0"
DEFAULT_TIMEOUT = 300

# WordPress only accepts Application Passwords over HTTPS, except on local development sites.
LOCAL_HOST_SUFFIXES = (".local", ".localhost", ".test")
LOCAL_HOSTS = ("localhost", "127.0.0.1", "::1")


class PublishError(Exception):
    def __init__(self, message, status=None, code=None):
        super().__init__(message)
        self.status = status
        self.code = code


@dataclass(frozen=True)
class Connection:
    site_url: str
    username: str
    app_password: str


def is_local_host(host):
    host = (host or "").lower()
    return host in LOCAL_HOSTS or host.endswith(LOCAL_HOST_SUFFIXES)


def normalize_site_url(site_url):
    site_url = (site_url or "").strip()

    if not site_url:
        raise PublishError("Set the site URL in the add-on preferences.")

    if "://" not in site_url:
        site_url = "https://" + site_url

    parts = urlsplit(site_url)

    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise PublishError("The site URL must look like https://example.com.")

    if parts.scheme == "http" and not is_local_host(parts.hostname):
        raise PublishError(
            "Use an https:// site URL. The application password would be sent in clear text over http."
        )

    return f"{parts.scheme}://{parts.netloc}{parts.path}".rstrip("/")


def api_url(site_url, route=""):
    """URL of a REST route that works with and without pretty permalinks."""
    return f"{normalize_site_url(site_url)}/?rest_route={quote(API_PATH + route, safe='/')}"


def auth_header(username, app_password):
    if not username or not app_password:
        raise PublishError("Set the username and application password in the add-on preferences.")

    token = base64.b64encode(f"{username}:{app_password}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def encode_multipart(fields, files):
    """Encode form fields and files as multipart/form-data.

    ``fields`` maps names to strings. ``files`` is a list of ``(field, filename, content_type, data)``.
    Returns ``(body, content_type_header)``.
    """
    boundary = f"----RefractionBlender{uuid.uuid4().hex}"
    lines = []

    for name, value in fields.items():
        lines.append(f"--{boundary}\r\n".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{_quote_header(name)}"\r\n\r\n'.encode("utf-8"))
        lines.append(str(value).encode("utf-8"))
        lines.append(b"\r\n")

    for field, filename, content_type, data in files:
        lines.append(f"--{boundary}\r\n".encode("utf-8"))
        lines.append(
            (
                f'Content-Disposition: form-data; name="{_quote_header(field)}"; '
                f'filename="{_quote_header(filename)}"\r\n'
                f"Content-Type: {content_type}\r\n\r\n"
            ).encode("utf-8")
        )
        lines.append(data)
        lines.append(b"\r\n")

    lines.append(f"--{boundary}--\r\n".encode("utf-8"))

    return b"".join(lines), f"multipart/form-data; boundary={boundary}"


def _quote_header(value):
    return str(value).replace("\\", "\\\\").replace('"', '\\"').replace("\r", "").replace("\n", "")


def guess_content_type(path):
    extension = os.path.splitext(path)[1].lower()

    if extension == ".glb":
        return "model/gltf-binary"

    if extension == ".gltf":
        return "model/gltf+json"

    return mimetypes.guess_type(path)[0] or "application/octet-stream"


def _send(request, opener, timeout):
    try:
        with opener(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8") or "{}")
    except HTTPError as error:
        raise _error_from_response(error) from None
    except URLError as error:
        raise PublishError(f"Could not reach the site: {error.reason}") from None
    except ValueError:
        raise PublishError("The site did not answer with JSON. Is the Refraction plugin active?") from None


def _error_from_response(error):
    message = None
    code = None

    try:
        payload = json.loads(error.read().decode("utf-8"))
        message = payload.get("message")
        code = payload.get("code")
    except (ValueError, AttributeError):
        pass

    if error.code == 404 and code in (None, "rest_no_route"):
        message = "The site has no Blender endpoint. Is the Refraction plugin installed and active?"
    elif error.code == 401 and code in (None, "rest_forbidden"):
        # WordPress answers a wrong application password with a generic "not allowed" message.
        message = "The site refused the username or application password."
    elif error.code == 403 and code in (None, "rest_forbidden"):
        message = "This WordPress user is not allowed to upload files."

    return PublishError(message or f"The site answered HTTP {error.code}.", status=error.code, code=code)


def _request(connection, route="", data=None, content_type=None):
    headers = {
        "Accept": "application/json",
        "Authorization": auth_header(connection.username, connection.app_password),
        "User-Agent": USER_AGENT,
    }

    if content_type:
        headers["Content-Type"] = content_type

    return Request(
        api_url(connection.site_url, route),
        data=data,
        headers=headers,
        method="POST" if data is not None else "GET",
    )


def check_connection(connection, opener=urlopen, timeout=30):
    return _send(_request(connection), opener, timeout)


def publish(
    connection,
    model_path,
    poster_path=None,
    title="",
    source="",
    attachment_id=0,
    opener=urlopen,
    timeout=DEFAULT_TIMEOUT,
):
    """Upload a model (and optional poster). With ``attachment_id``, replace that model's file."""
    fields = {}

    if title:
        fields["title"] = title

    if source:
        fields["source"] = source

    if attachment_id:
        fields["attachment_id"] = str(int(attachment_id))

    files = [("model", os.path.basename(model_path), guess_content_type(model_path), _read(model_path))]

    if poster_path:
        files.append(("poster", os.path.basename(poster_path), guess_content_type(poster_path), _read(poster_path)))

    body, content_type = encode_multipart(fields, files)

    return _send(_request(connection, "/models", body, content_type), opener, timeout)


def _read(path):
    with open(path, "rb") as handle:
        return handle.read()
