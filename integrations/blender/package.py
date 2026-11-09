"""Build the installable add-on zip: python3 integrations/blender/package.py

Writes integrations/blender/dist/refraction_publisher-<version>.zip with the add-on in a single
top-level folder, a layout both legacy add-on install (Blender 3.6 to 4.1) and extension
"Install from Disk" (Blender 4.2+) accept.
"""

import os
import re
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ADDON = "refraction_publisher"
SOURCE = os.path.join(HERE, ADDON)
SKIP_DIRS = {"__pycache__"}


def read_version():
    with open(os.path.join(SOURCE, "blender_manifest.toml"), encoding="utf-8") as handle:
        match = re.search(r'^version\s*=\s*"([^"]+)"', handle.read(), re.MULTILINE)

    return match.group(1)


def main():
    dist = os.path.join(HERE, "dist")
    os.makedirs(dist, exist_ok=True)
    target = os.path.join(dist, f"{ADDON}-{read_version()}.zip")

    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for root, dirs, files in os.walk(SOURCE):
            dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)

            for name in sorted(files):
                if name.endswith(".pyc"):
                    continue

                path = os.path.join(root, name)
                archive.write(path, os.path.join(ADDON, os.path.relpath(path, SOURCE)))

    print(target)


if __name__ == "__main__":
    main()
