"""Tests for the Blender add-on's HTTP client. Run: python3 -m unittest discover integrations/blender/tests"""

import base64
import io
import json
import os
import sys
import tempfile
import unittest
from email import message_from_bytes
from urllib.error import HTTPError, URLError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "refraction_publisher"))

import client  # noqa: E402


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


class RecordingOpener:
    def __init__(self, payload=None, error=None):
        self.payload = payload if payload is not None else {}
        self.error = error
        self.requests = []

    def __call__(self, request, timeout):
        self.requests.append(request)

        if self.error:
            raise self.error

        return FakeResponse(json.dumps(self.payload).encode("utf-8"))


def http_error(status, payload):
    body = io.BytesIO(json.dumps(payload).encode("utf-8"))
    return HTTPError("https://example.com", status, "error", {}, body)


def parse_multipart(request):
    raw = b"Content-Type: " + request.get_header("Content-type").encode() + b"\r\n\r\n" + request.data
    message = message_from_bytes(raw)
    parts = {}

    for part in message.get_payload():
        name = part.get_param("name", header="content-disposition")
        parts[name] = {
            "filename": part.get_filename(),
            "content_type": part.get_content_type(),
            "data": part.get_payload(decode=True),
        }

    return parts


CONNECTION = client.Connection("https://example.com/", "editor", "abcd efgh ijkl")


class UrlTests(unittest.TestCase):
    def test_api_url_uses_rest_route_query(self):
        self.assertEqual(
            client.api_url("https://example.com/blog/", "/models"),
            "https://example.com/blog/?rest_route=/refraction/v1/blender/models",
        )

    def test_scheme_defaults_to_https(self):
        self.assertTrue(client.api_url("example.com").startswith("https://example.com/"))

    def test_plain_http_is_refused_for_remote_sites(self):
        with self.assertRaises(client.PublishError):
            client.api_url("http://example.com")

    def test_plain_http_is_allowed_for_local_sites(self):
        for site in ("http://localhost:8888", "http://127.0.0.1:9400", "http://mysite.local", "http://shop.test"):
            self.assertTrue(client.api_url(site).startswith("http://"), site)

    def test_empty_site_url_is_an_error(self):
        with self.assertRaises(client.PublishError):
            client.api_url("  ")


class AuthTests(unittest.TestCase):
    def test_basic_auth_header(self):
        header = client.auth_header("editor", "abcd efgh")
        self.assertEqual(base64.b64decode(header.split(" ", 1)[1]).decode(), "editor:abcd efgh")

    def test_missing_credentials(self):
        with self.assertRaises(client.PublishError):
            client.auth_header("editor", "")


class CheckConnectionTests(unittest.TestCase):
    def test_sends_authenticated_get(self):
        opener = RecordingOpener({"site": "Demo", "user": "Editor"})

        status = client.check_connection(CONNECTION, opener=opener)

        self.assertEqual(status["site"], "Demo")
        request = opener.requests[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertTrue(request.get_header("Authorization").startswith("Basic "))

    def test_missing_route_explains_the_plugin_is_missing(self):
        opener = RecordingOpener(error=http_error(404, {"code": "rest_no_route", "message": "No route"}))

        with self.assertRaises(client.PublishError) as caught:
            client.check_connection(CONNECTION, opener=opener)

        self.assertIn("Refraction plugin", str(caught.exception))

    def test_wordpress_error_message_is_kept(self):
        opener = RecordingOpener(error=http_error(401, {"code": "incorrect_password", "message": "Wrong password."}))

        with self.assertRaises(client.PublishError) as caught:
            client.check_connection(CONNECTION, opener=opener)

        self.assertEqual(str(caught.exception), "Wrong password.")
        self.assertEqual(caught.exception.status, 401)
        self.assertEqual(caught.exception.code, "incorrect_password")

    def test_generic_unauthorized_explains_credentials(self):
        opener = RecordingOpener(error=http_error(401, {"code": "rest_forbidden", "message": "Sorry, you are not allowed to do that."}))

        with self.assertRaises(client.PublishError) as caught:
            client.check_connection(CONNECTION, opener=opener)

        self.assertIn("application password", str(caught.exception))

    def test_generic_forbidden_explains_missing_capability(self):
        opener = RecordingOpener(error=http_error(403, {"code": "rest_forbidden", "message": "Sorry, you are not allowed to do that."}))

        with self.assertRaises(client.PublishError) as caught:
            client.check_connection(CONNECTION, opener=opener)

        self.assertIn("not allowed to upload", str(caught.exception))

    def test_network_failure(self):
        opener = RecordingOpener(error=URLError("Name or service not known"))

        with self.assertRaises(client.PublishError) as caught:
            client.check_connection(CONNECTION, opener=opener)

        self.assertIn("Could not reach", str(caught.exception))


class PublishTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.model = os.path.join(self.tempdir.name, "chair.glb")
        self.poster = os.path.join(self.tempdir.name, "chair-poster.png")

        with open(self.model, "wb") as handle:
            handle.write(b"glTF\x02\x00\x00\x00\x0c\x00\x00\x00")

        with open(self.poster, "wb") as handle:
            handle.write(b"\x89PNG\r\n\x1a\n")

    def tearDown(self):
        self.tempdir.cleanup()

    def test_uploads_model_poster_and_fields(self):
        opener = RecordingOpener({"id": 42, "url": "https://example.com/chair.glb"})

        result = client.publish(
            CONNECTION, self.model, self.poster, title="Chair \"v2\"", source="chair.blend", attachment_id=42, opener=opener
        )

        self.assertEqual(result["id"], 42)
        request = opener.requests[0]
        self.assertEqual(request.get_method(), "POST")
        self.assertTrue(request.full_url.endswith("rest_route=/refraction/v1/blender/models"))

        parts = parse_multipart(request)
        self.assertEqual(parts["title"]["data"].decode(), 'Chair "v2"')
        self.assertEqual(parts["source"]["data"].decode(), "chair.blend")
        self.assertEqual(parts["attachment_id"]["data"].decode(), "42")
        self.assertEqual(parts["model"]["filename"], "chair.glb")
        self.assertEqual(parts["model"]["content_type"], "model/gltf-binary")
        self.assertEqual(parts["model"]["data"], b"glTF\x02\x00\x00\x00\x0c\x00\x00\x00")
        self.assertEqual(parts["poster"]["content_type"], "image/png")

    def test_new_model_sends_no_attachment_id(self):
        opener = RecordingOpener({"id": 7})

        client.publish(CONNECTION, self.model, opener=opener)

        parts = parse_multipart(opener.requests[0])
        self.assertNotIn("attachment_id", parts)
        self.assertNotIn("poster", parts)


if __name__ == "__main__":
    unittest.main()
