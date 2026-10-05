#!/usr/bin/env python3
"""Download Edge Studio's free voice-over scripts for study.

Usage: python3 fetch_edge_scripts.py <out.json> [type name filter ...]
  e.g. python3 fetch_edge_scripts.py /tmp/edge.json Technology Luxury "Non profit"

The site sits behind a Sucuri JavaScript cookie challenge. This solves it with Node
and keeps the cookies, then reads the WordPress REST API:
  /wp-json/wp/v2/script_type        (categories such as Technology or Luxury)
  /wp-json/wp/v2/script?script_type=<id>
Output: {"<type name>": [[title, plain text], ...]}. Needs curl and node on PATH.
"""
import base64, html, json, re, subprocess, sys

BASE = "https://edgestudio.com"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36"
cookies: dict[str, str] = {}


def _get(url: str) -> str:
    ck = "; ".join(f"{k}={v}" for k, v in cookies.items())
    return subprocess.run(["curl", "-sSL", "-A", UA, "-H", f"Cookie: {ck}", url], capture_output=True).stdout.decode(errors="ignore")


def _solve(page: str) -> None:
    code = base64.b64decode(re.search(r"S='([^']+)'", page).group(1)).decode()
    js = "const document={cookie:''};const location={reload(){}};" + code + ";console.log(document.cookie.split(';')[0])"
    k, v = subprocess.run(["node", "-e", js], capture_output=True).stdout.decode().strip().split("=", 1)
    cookies[k] = v


def fetch(url: str) -> str:
    for _ in range(20):
        page = _get(url)
        if "sucuri_cloudproxy_js" not in page:
            return page
        _solve(page)
    raise RuntimeError(f"challenge not solved for {url}")


def text(raw: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "\n", raw)).strip()


def main() -> None:
    out, wanted = sys.argv[1], [w.lower() for w in sys.argv[2:]]
    types = json.loads(fetch(f"{BASE}/wp-json/wp/v2/script_type?per_page=100&_fields=id,name,count"))
    result = {}
    for t in types:
        name = html.unescape(t["name"])
        if wanted and not any(w in name.lower() for w in wanted):
            continue
        items = json.loads(fetch(f"{BASE}/wp-json/wp/v2/script?script_type={t['id']}&per_page=50&_fields=title,content"))
        result[name] = [[text(i["title"]["rendered"]), text(i["content"]["rendered"])] for i in items]
        print(f"{name}: {len(result[name])} scripts", file=sys.stderr)
    json.dump(result, open(out, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
