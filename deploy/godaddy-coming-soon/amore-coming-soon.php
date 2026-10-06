<?php
/**
 * Plugin Name: Amore Coming Soon
 * Description: Serves the static coming-soon page for public visitors.
 */

if (!defined('ABSPATH')) {
  exit;
}

add_action('template_redirect', function () {
  if (is_admin() || wp_doing_ajax() || wp_doing_cron() || (defined('WP_CLI') && WP_CLI)) {
    return;
  }

  $uri = $_SERVER['REQUEST_URI'] ?? '';
  if (
    strpos($uri, 'wp-login.php') !== false ||
    strpos($uri, 'wp-admin') !== false ||
    strpos($uri, 'wp-json') !== false ||
    strpos($uri, 'xmlrpc.php') !== false
  ) {
    return;
  }

  $file = ABSPATH . 'index.html';
  if (!is_readable($file)) {
    return;
  }

  status_header(200);
  header('Content-Type: text/html; charset=utf-8');
  header('X-Amore-Coming-Soon: 1');
  header('Cache-Control: public, max-age=300');
  readfile($file);
  exit;
}, 0);
