"""Check maintained presentation docs without third-party dependencies or network.

Validates relative files, local heading fragments and image existence. Legacy
proposal documents are linked as history, not silently treated as current docs.
"""
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import struct
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    'README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'backend/README.md',
    'apps/web/web_app/README.md', 'apps/mobile/flutter_app/README.md', 'intelligence/README.md',
    'docs/README.md', 'docs/FEATURE_STATUS.md', 'docs/DATA_SOURCES.md',
    'docs/REPOSITORY_SETTINGS.md', 'docs/PRESENTATION_AUDIT.md',
    'docs/development/setup.md', 'docs/development/branching.md',
    'docs/architecture/system-architecture.md', 'docs/api/api-contract.md',
    'docs/v1_deployment_guide.md', 'docs/screenshots/README.md',
]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for name in ('src', 'href'):
            if name in attrs:
                self.links.append(attrs[name])
        if tag == 'img' and not attrs.get('alt'):
            raise ValueError('HTML image requires descriptive alt text')


def headings(text):
    counts, result = {}, set()
    for title in re.findall(r'^#{1,6}\s+(.+?)\s*#*$', text, re.M):
        title = re.sub(r'<[^>]*>', '', title)
        slug = re.sub(r'[^\w\- ]', '', unescape(title).lower()).replace(' ', '-')
        count = counts.get(slug, 0)
        counts[slug] = count + 1
        result.add(slug + (f'-{count}' if count else ''))
    return result


def check():
    errors, checked = [], 0
    for name in FILES:
        path = ROOT / name
        if not path.is_file():
            errors.append(f'{name}: maintained document is missing')
            continue
        text = path.read_text(encoding='utf-8')
        # Do not interpret example code as documentation links.
        text = re.sub(r'```.*?```', '', text, flags=re.S)
        parser = Links()
        try:
            parser.feed(text)
        except ValueError as exc:
            errors.append(f'{name}: {exc}')
        links = re.findall(r'!?\[[^\]]*\]\(([^)]+)\)', text) + parser.links
        for link in links:
            link = link.strip().strip('<>')
            parts = urlsplit(link)
            if parts.scheme or parts.netloc:
                continue
            checked += 1
            target = (path.parent / unquote(parts.path)).resolve() if parts.path else path
            if not target.exists():
                errors.append(f'{name}: missing {link}')
            elif parts.fragment and target.suffix == '.md':
                if unquote(parts.fragment) not in headings(target.read_text(encoding='utf-8')):
                    errors.append(f'{name}: missing heading {link}')
        for alt, link in re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', text):
            if not alt.strip():
                errors.append(f'{name}: Markdown image requires descriptive alt text: {link}')
    manifest_path = ROOT / 'docs/screenshots/manifest.json'
    if not manifest_path.is_file():
        errors.append('Screenshot manifest is missing')
    else:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        for entry in manifest['images']:
            screenshot = ROOT / 'docs/screenshots' / entry['path']
            if not screenshot.is_file():
                errors.append(f'Manifest: missing {entry["path"]}')
                continue
            data = screenshot.read_bytes()
            if data[:8] != b'\x89PNG\r\n\x1a\n':
                errors.append(f'Manifest: invalid PNG {entry["path"]}')
                continue
            width, height = struct.unpack('>II', data[16:24])
            facts = {'width': width, 'height': height, 'sha256': hashlib.sha256(data).hexdigest()}
            if '--refresh-screenshots' in sys.argv:
                entry.update(facts)
            elif any(entry.get(k) != v for k, v in facts.items()):
                errors.append(f'Manifest: changed image {entry["path"]}; review provenance and refresh metadata')
        if '--refresh-screenshots' in sys.argv and not errors:
            manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    if errors:
        print('\n'.join(errors))
        return 1
    print(f'OK: {len(FILES)} maintained documents; {checked} local links/images/fragments.')
    return 0


if __name__ == '__main__':
    sys.exit(check())
