# GoDaddy: Amore coming-soon page

Upload the contents of this folder (not the folder itself) into `public_html`
on the GoDaddy Web Hosting plan.

## Files

- `index.html` — the coming-soon page
- `images/hero.jpeg` — background photo
- `images/logo-alt.png` — logo
- `.htaccess` — rewrite root / `index.php` to the hold page
- `amore-coming-soon.php` — must-use plugin (copy into `wp-content/mu-plugins/`)

On Managed WordPress, keep the WordPress files on disk. The MU plugin +
`index.html` are what actually hold the public site. Also add
`www.amoreglobaltravels.com` as a domain alias and re-issue SSL so **www**
works (apex alone is not enough).

## Steps

1. In GoDaddy, open **Web Hosting** → **cPanel** (or **Manage**) → **File Manager**.
2. Open `public_html` (or `html`).
3. Upload `index.html`, `.htaccess`, and the `images` folder into that root.
4. Upload `amore-coming-soon.php` into `wp-content/mu-plugins/`.
5. In GoDaddy hosting settings, find the **server IP address** for this plan.
6. In Wix DNS for `amoreglobaltravels.com`, replace the website records with that IP. Do not change MX or TXT records.
7. In GoDaddy, assign both `amoreglobaltravels.com` and `www` to this hosting plan and turn on free SSL for both.
