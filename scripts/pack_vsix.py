#!/usr/bin/env python3
"""Pack novel-writer-ext into a .vsix without requiring vsce/npm."""
from __future__ import annotations

import json
import os
import re
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT


def load_package() -> dict:
    with open(ROOT / "package.json", encoding="utf-8") as f:
        return json.load(f)


def should_include(rel: str) -> bool:
    rel = rel.replace("\\", "/")
    skip_prefixes = (
        "scripts/",
        ".git/",
        ".vscode/",
        "node_modules/",
    )
    if any(rel.startswith(p) for p in skip_prefixes):
        return False
    if rel.endswith(".vsix") or rel.endswith(".map"):
        return False
    if rel in {".gitignore", ".vscodeignore"}:
        return False
    # keep README/CHANGELOG/LICENSE md; skip other md at root extras if any
    if rel.endswith(".md") and rel not in {"README.md", "CHANGELOG.md"}:
        # allow nothing else for now
        return False
    return True


def content_types_xml(paths: list[str]) -> str:
    exts = set()
    for p in paths:
        if "." in Path(p).name:
            exts.add(Path(p).suffix.lower())
    defaults = {
        ".json": "application/json",
        ".js": "application/javascript",
        ".md": "text/markdown",
        ".txt": "text/plain",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".vsixmanifest": "text/xml",
    }
    lines = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '  <Default Extension="vsixmanifest" ContentType="text/xml"/>',
        '  <Default Extension="xml" ContentType="text/xml"/>',
    ]
    for ext in sorted(exts):
        if ext == ".vsixmanifest":
            continue
        ctype = defaults.get(ext, "application/octet-stream")
        lines.append(f'  <Default Extension="{ext.lstrip(".")}" ContentType="{ctype}"/>')
    lines.append("</Types>")
    return "\n".join(lines) + "\n"


def vsix_manifest(pkg: dict, files: list[str]) -> str:
    name = pkg["name"]
    version = pkg["version"]
    publisher = pkg.get("publisher", "publisher")
    display = escape(pkg.get("displayName", name))
    desc = escape(pkg.get("description", ""))
    engines = escape(pkg.get("engines", {}).get("vscode", "^1.85.0"))
    categories = pkg.get("categories") or ["Other"]
    cats = "\n".join(f"        <Category>{escape(c)}</Category>" for c in categories)
    assets = [
        '    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />',
    ]
    if (ROOT / "README.md").exists():
        assets.append(
            '    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />'
        )
    if (ROOT / "CHANGELOG.md").exists():
        assets.append(
            '    <Asset Type="Microsoft.VisualStudio.Services.Content.Changelog" Path="extension/CHANGELOG.md" Addressable="true" />'
        )
    if (ROOT / "LICENSE").exists():
        assets.append(
            '    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true" />'
        )
    icon = pkg.get("icon")
    if icon and (ROOT / icon).exists():
        assets.append(
            f'    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/{icon.replace(chr(92), "/")}" Addressable="true" />'
        )
    assets_xml = "\n".join(assets)
    identity = f'{publisher}.{name}'
    return f'''<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="{escape(name)}" Version="{escape(version)}" Publisher="{escape(publisher)}" />
    <DisplayName>{display}</DisplayName>
    <Description xml:space="preserve">{desc}</Description>
    <Tags>novel,writing,fiction,markdown,boss key</Tags>
    <Categories>
{cats}
    </Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="{engines}" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="" />
      <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="{escape((pkg.get("repository") or {}).get("url", ""))}" />
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
{assets_xml}
  </Assets>
</PackageManifest>
'''


def collect_files() -> list[tuple[str, Path]]:
    items: list[tuple[str, Path]] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if not should_include(rel):
            continue
        items.append((rel, path))
    return items


def main() -> None:
    pkg = load_package()
    files = collect_files()
    out_name = f"{pkg['name']}-{pkg['version']}.vsix"
    out_path = OUT_DIR / out_name

    manifest = vsix_manifest(pkg, [r for r, _ in files])
    ctypes = content_types_xml([r for r, _ in files] + ["extension.vsixmanifest"])

    if out_path.exists():
        out_path.unlink()

    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("extension.vsixmanifest", manifest)
        zf.writestr("[Content_Types].xml", ctypes)
        for rel, path in files:
            zf.write(path, arcname=f"extension/{rel}")

    print(f"Packed {out_path}")
    print(f"Files: {len(files)}")
    print(f"Size: {out_path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
