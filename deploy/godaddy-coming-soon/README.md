# GoDaddy: Amore coming-soon page

Upload the contents of this folder (not the folder itself) into `public_html`
on the GoDaddy Web Hosting plan.

## Files

- `index.html` — the coming-soon page
- `images/hero.jpeg` — background photo
- `images/logo-alt.png` — logo
- `.htaccess` — HTTPS redirect once SSL is on

## Steps

1. In GoDaddy, open **Web Hosting** → **cPanel** (or **Manage**) → **File Manager**.
2. Open `public_html`. Delete or move any old WordPress files if they are still there.
3. Upload `index.html`, `.htaccess`, and the `images` folder.
4. In GoDaddy hosting settings, find the **server IP address** for this plan.
5. In Wix DNS for `amoreglobaltravels.com`, replace the website records with that IP (see the checklist the agent sent). Do not change MX or TXT records.
6. In GoDaddy, assign `amoreglobaltravels.com` to this hosting plan and turn on free SSL when the domain resolves.
